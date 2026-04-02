import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IConsoleTracker } from '@jupyterlab/console';
import { ICommandPalette } from '@jupyterlab/apputils';
import { Kernel } from '@jupyterlab/services';
import { spreadsheetIcon } from '@jupyterlab/ui-components';

import { CommManager } from './comm/CommManager';
import { VariableExplorerApp } from './components/VariableExplorerApp';
import { cloneStylesheets } from './utils/stylesheetCloner';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

const PLUGIN_ID = 'variable-explorer:plugin';
const COMMAND_ID = 'variable-explorer:open';

/**
 * Manages the detached Variable Explorer window and its React tree.
 */
class VariableExplorerManager {
  private _commManager = new CommManager();
  private _externalWindow: Window | null = null;
  private _root: any = null;
  private _pollTimer: number | null = null;

  get commManager(): CommManager {
    return this._commManager;
  }

  get isOpen(): boolean {
    return this._externalWindow !== null && !this._externalWindow.closed;
  }

  /**
   * Open the Variable Explorer in a detached window.
   */
  open(): void {
    if (this.isOpen) {
      this._externalWindow!.focus();
      return;
    }

    const width = Math.min(1400, screen.availWidth * 0.8);
    const height = Math.min(900, screen.availHeight * 0.8);
    const left = Math.round((screen.availWidth - width) / 2);
    const top = Math.round((screen.availHeight - height) / 2);

    this._externalWindow = window.open(
      '',
      'variable-explorer',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );

    if (!this._externalWindow) {
      alert('Variable Explorer: Pop-up was blocked by your browser.\n\nTo fix this, allow pop-ups for this site:\n1. Click the blocked pop-up icon in your address bar, or\n2. Go to Settings → Privacy → Pop-ups → Add this site to "Allowed"');
      return;
    }

    const doc = this._externalWindow.document;
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Variable Explorer</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #ve-root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="ve-root"></div>
</body>
</html>`);
    doc.close();

    cloneStylesheets(document, doc);

    // Copy theme
    const parentBody = document.body;
    const childBody = doc.body;
    for (let i = 0; i < parentBody.attributes.length; i++) {
      const attr = parentBody.attributes[i];
      if (attr.name.startsWith('data-jp-')) {
        childBody.setAttribute(attr.name, attr.value);
      }
    }
    childBody.className = parentBody.className;

    const container = doc.getElementById('ve-root')!;
    ReactDOM.render(
      React.createElement(VariableExplorerApp, {
        commManager: this._commManager,
        autoDetach: false
      }),
      container
    );
    this._root = container;

    this._pollTimer = window.setInterval(() => {
      if (this._externalWindow && this._externalWindow.closed) {
        this._cleanup();
      }
    }, 500);

    this._externalWindow.addEventListener('beforeunload', () => {
      this._cleanup();
    });
  }

  private _cleanup(): void {
    if (this._pollTimer !== null) {
      window.clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._root) {
      try { ReactDOM.unmountComponentAtNode(this._root); } catch { /* */ }
      this._root = null;
    }
    this._externalWindow = null;
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'A Spyder/Stata-grade variable explorer for JupyterLab',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ICommandPalette, IConsoleTracker],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    palette: ICommandPalette | null,
    consoleTracker: IConsoleTracker | null
  ) => {
    console.log('Variable Explorer extension activated');

    const manager = new VariableExplorerManager();

    const connectToKernel = async (kernel: Kernel.IKernelConnection | null | undefined) => {
      if (!kernel) return;
      try {
        await manager.commManager.connect(kernel);
      } catch (e) {
        console.error('Variable Explorer: Failed to connect to kernel', e);
      }
    };

    notebookTracker.currentChanged.connect(async (_, notebook) => {
      if (!notebook) return;
      const session = notebook.sessionContext;
      session.ready.then(() => {
        connectToKernel(session.session?.kernel);
      });
      session.kernelChanged.connect((_, args) => {
        if (args.newValue) {
          connectToKernel(args.newValue);
        }
      });
    });

    if (consoleTracker) {
      consoleTracker.currentChanged.connect(async (_, consolePanel) => {
        if (!consolePanel) return;
        const session = consolePanel.sessionContext;
        session.ready.then(() => {
          connectToKernel(session.session?.kernel);
        });
        session.kernelChanged.connect((_, args) => {
          if (args.newValue) {
            connectToKernel(args.newValue);
          }
        });
      });
    }

    // Register command — the schema declares this as a toolbar button + menu item
    app.commands.addCommand(COMMAND_ID, {
      label: 'Variable Explorer',
      caption: 'Open Variable Explorer in a separate window',
      icon: spreadsheetIcon,
      execute: () => {
        manager.open();
        const currentNotebook = notebookTracker.currentWidget;
        if (currentNotebook) {
          const kernel = currentNotebook.sessionContext.session?.kernel;
          connectToKernel(kernel);
        }
      }
    });

    if (palette) {
      palette.addItem({
        command: COMMAND_ID,
        category: 'Variable Explorer'
      });
    }
  }
};

export default plugin;
