import { KernelMessage as JupyterKernelMessage, Kernel } from '@jupyterlab/services';
import { Signal, ISignal } from '@lumino/signaling';
import { FrontendMessage, ICommMessage } from './protocol';

const COMM_TARGET = 'variable_explorer';

const INIT_CODE = `
try:
    from variable_explorer.kernel import init_comm as _ve_init
    _ve_init()
    del _ve_init
except ImportError as e:
    print(f"Variable Explorer: kernel package not found: {e}")
except Exception as e:
    print(f"Variable Explorer: init error: {e}")
`.trim();

export class CommManager {
  private _comm: any = null;
  private _kernel: Kernel.IKernelConnection | null = null;
  private _messageReceived = new Signal<CommManager, ICommMessage>(this);
  private _connectionChanged = new Signal<CommManager, boolean>(this);
  private _isConnected = false;

  get messageReceived(): ISignal<CommManager, ICommMessage> {
    return this._messageReceived;
  }

  get connectionChanged(): ISignal<CommManager, boolean> {
    return this._connectionChanged;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(kernel: Kernel.IKernelConnection): Promise<void> {
    // Disconnect existing
    this.disconnect();
    this._kernel = kernel;

    // Inject the Python init code
    const future = kernel.requestExecute({
      code: INIT_CODE,
      silent: true,
      store_history: false
    });
    await future.done;

    // Open a comm from the frontend
    this._comm = kernel.createComm(COMM_TARGET);

    // Handle incoming messages
    this._comm.onMsg = (msg: JupyterKernelMessage.ICommMsgMsg) => {
      const data = msg.content.data as unknown as ICommMessage;
      if (data && data.type) {
        this._messageReceived.emit(data);
      }
    };

    this._comm.onClose = () => {
      this._setConnected(false);
    };

    // Open the comm channel
    await this._comm.open({}).done;
    this._setConnected(true);

    // Listen for kernel shutdown/restart
    kernel.statusChanged.connect(this._onKernelStatus, this);
  }

  send(msg: FrontendMessage): void {
    if (this._comm && this._isConnected) {
      this._comm.send(msg as any);
    }
  }

  refresh(): void {
    this.send({ type: 'refresh' });
  }

  disconnect(): void {
    if (this._kernel) {
      this._kernel.statusChanged.disconnect(this._onKernelStatus, this);
    }
    if (this._comm) {
      try {
        this._comm.close({});
      } catch {
        // Comm may already be closed
      }
      this._comm = null;
    }
    this._kernel = null;
    this._setConnected(false);
  }

  private _setConnected(connected: boolean): void {
    if (this._isConnected !== connected) {
      this._isConnected = connected;
      this._connectionChanged.emit(connected);
    }
  }

  private _onKernelStatus(
    kernel: Kernel.IKernelConnection,
    status: JupyterKernelMessage.Status
  ): void {
    if (status === 'restarting' || status === 'dead') {
      this._setConnected(false);
      this._comm = null;
    }
    if (status === 'idle' && !this._isConnected && this._kernel) {
      // Kernel restarted — try to reconnect
      this.connect(this._kernel).catch(e => {
        console.error('Variable Explorer: reconnect failed', e);
      });
    }
  }
}
