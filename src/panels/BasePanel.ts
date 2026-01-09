import * as vscode from "vscode";
import * as path from "path";
import { detectLanguage } from "../lib/paizaApi";
import { getWebviewContent } from "../utils/utils";
import { OpenEditor } from "../types/OpenEditor";

/**
 * Configuration for creating a panel
 */
export interface PanelConfig {
  viewType: string;
  title: string;
  webviewJsPath: string[];
}

/**
 * Abstract base class for Paiza Runner panels
 * Provides common functionality for webview panels
 */
export abstract class BasePanel<T extends BasePanel<T>> {
  protected readonly _panel: vscode.WebviewPanel;
  protected _disposables: vscode.Disposable[] = [];
  protected _targetDocument: vscode.TextDocument | undefined;

  protected constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    config: PanelConfig
  ) {
    this._panel = panel;
    this._panel.webview.html = getWebviewContent(
      this._panel.webview,
      extensionUri,
      config.webviewJsPath
    );

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this._handleMessage(message);
      },
      null,
      this._disposables
    );

    // Handle disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * Abstract method to handle messages from webview
   * Subclasses must implement this to handle their specific messages
   */
  protected abstract _handleMessage(message: any): Promise<void>;

  /**
   * Abstract method to clear the current panel reference
   * Subclasses must implement this to clear their static currentPanel
   */
  protected abstract _clearCurrentPanel(): void;

  /**
   * Get the webview panel
   */
  public get panel(): vscode.WebviewPanel {
    return this._panel;
  }

  /**
   * Dispose the panel
   */
  public dispose() {
    this._clearCurrentPanel();
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Set the target document and notify webview
   */
  protected _setTargetDocument(document: vscode.TextDocument) {
    this._targetDocument = document;
    // Auto-detect language and send to webview
    const detectedLanguage = detectLanguage(document.languageId);
    if (detectedLanguage) {
      this._panel.webview.postMessage({
        command: "setLanguage",
        language: detectedLanguage,
      });
    }
    // Send target file info
    this._panel.webview.postMessage({
      command: "setTargetFile",
      uri: document.uri.toString(),
      fileName: path.basename(document.fileName),
    });
  }

  /**
   * Send list of open editors to webview
   */
  protected _sendOpenEditors() {
    // Get all visible text editors
    const openEditors: OpenEditor[] = vscode.workspace.textDocuments
      .filter((doc) => !doc.isUntitled && doc.uri.scheme === "file")
      .map((doc) => ({
        uri: doc.uri.toString(),
        fileName: path.basename(doc.fileName),
        fullPath: doc.fileName,
      }));

    this._panel.webview.postMessage({
      command: "openEditors",
      editors: openEditors,
      currentUri: this._targetDocument?.uri.toString(),
    });
  }

  /**
   * Handle common messages (getCurrentLanguage, getOpenEditors, setTargetFile)
   * Returns true if the message was handled, false otherwise
   */
  protected async _handleCommonMessage(message: any): Promise<boolean> {
    switch (message.command) {
      case "getCurrentLanguage":
        if (this._targetDocument) {
          this._setTargetDocument(this._targetDocument);
        }
        return true;

      case "getOpenEditors":
        this._sendOpenEditors();
        return true;

      case "setTargetFile":
        const uri = message.uri;
        if (uri) {
          const document = vscode.workspace.textDocuments.find(
            (doc) => doc.uri.toString() === uri
          );
          if (document) {
            this._setTargetDocument(document);
          }
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Post a message to the webview
   */
  protected _postMessage(message: any) {
    this._panel.webview.postMessage(message);
  }

  /**
   * Get the source code from target document
   * Returns null and sends error message if no document or empty
   */
  protected _getSourceCode(): string | null {
    if (!this._targetDocument) {
      this._postMessage({
        command: "error",
        error: "No file selected. Please open a file first.",
      });
      return null;
    }

    const sourceCode = this._targetDocument.getText();
    if (!sourceCode.trim()) {
      this._postMessage({
        command: "error",
        error: "The current file is empty.",
      });
      return null;
    }

    return sourceCode;
  }

  /**
   * Helper to create or show a panel
   */
  protected static _createPanel(
    config: PanelConfig,
    viewColumn?: vscode.ViewColumn,
    preserveFocus?: boolean
  ): vscode.WebviewPanel {
    const column = viewColumn ?? vscode.ViewColumn.Beside;
    return vscode.window.createWebviewPanel(
      config.viewType,
      config.title,
      { viewColumn: column, preserveFocus: preserveFocus },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
  }
}
