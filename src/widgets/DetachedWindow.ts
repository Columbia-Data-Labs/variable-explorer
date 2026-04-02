/**
 * Manages a detached browser window for the Variable Explorer.
 * Opens a popup via window.open(), clones stylesheets, and provides
 * a container element for React portal rendering.
 */

import { cloneStylesheets } from '../utils/stylesheetCloner';

export class DetachedWindow {
  private _externalWindow: Window | null = null;
  private _container: HTMLDivElement | null = null;
  private _onClose: (() => void) | null = null;
  private _pollTimer: number | null = null;

  get isOpen(): boolean {
    return this._externalWindow !== null && !this._externalWindow.closed;
  }

  get container(): HTMLDivElement | null {
    return this._container;
  }

  /**
   * Open a new browser window and prepare it for rendering.
   * Returns the container div to use as a React portal target.
   */
  open(title: string, onClose: () => void): HTMLDivElement {
    // Close existing if any
    this.close();

    this._onClose = onClose;

    // Open popup window
    const width = Math.min(1400, screen.availWidth * 0.8);
    const height = Math.min(900, screen.availHeight * 0.8);
    const left = Math.round((screen.availWidth - width) / 2);
    const top = Math.round((screen.availHeight - height) / 2);

    this._externalWindow = window.open(
      '',
      `ve-detached-${Date.now()}`,
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );

    if (!this._externalWindow) {
      throw new Error('Failed to open popup window. Check your browser popup blocker settings.');
    }

    const doc = this._externalWindow.document;

    // Write base HTML structure
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - Variable Explorer</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #ve-detached-root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
  <div id="ve-detached-root"></div>
</body>
</html>`);
    doc.close();

    // Clone all stylesheets from parent window
    cloneStylesheets(document, doc);

    // Copy JupyterLab theme data attributes to body
    const parentBody = document.body;
    const childBody = doc.body;
    for (let i = 0; i < parentBody.attributes.length; i++) {
      const attr = parentBody.attributes[i];
      if (attr.name.startsWith('data-jp-')) {
        childBody.setAttribute(attr.name, attr.value);
      }
    }
    // Also copy the class list for theme detection
    childBody.className = parentBody.className;

    // Get the container for React portal
    this._container = doc.getElementById('ve-detached-root') as HTMLDivElement;

    // Listen for window close
    // Note: beforeunload doesn't always fire reliably for popups,
    // so we also poll
    this._externalWindow.addEventListener('beforeunload', () => {
      this._handleClose();
    });

    // Poll to detect if window was closed (handles cases where
    // beforeunload doesn't fire, e.g., user closes via OS)
    this._pollTimer = window.setInterval(() => {
      if (this._externalWindow && this._externalWindow.closed) {
        this._handleClose();
      }
    }, 500);

    // Focus the new window
    this._externalWindow.focus();

    return this._container;
  }

  /**
   * Close the detached window and clean up.
   */
  close(): void {
    if (this._pollTimer !== null) {
      window.clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._externalWindow && !this._externalWindow.closed) {
      this._externalWindow.close();
    }
    this._externalWindow = null;
    this._container = null;
    this._onClose = null;
  }

  /**
   * Update the window title.
   */
  setTitle(title: string): void {
    if (this._externalWindow && !this._externalWindow.closed) {
      this._externalWindow.document.title = `${title} - Variable Explorer`;
    }
  }

  private _handleClose(): void {
    if (this._pollTimer !== null) {
      window.clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    this._externalWindow = null;
    this._container = null;
    const onClose = this._onClose;
    this._onClose = null;
    if (onClose) {
      onClose();
    }
  }
}
