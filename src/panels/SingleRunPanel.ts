import * as vscode from "vscode";
import { runAndWait } from "../lib/paizaApi";
import { BasePanel, PanelConfig } from "./BasePanel";

const PANEL_CONFIG: PanelConfig = {
  viewType: "paizaRunner",
  title: "Paiza Runner",
  webviewJsPath: ["dist", "webview.js"],
};

/**
 * WebView Panel for Paiza Runner
 * Provides GUI for language selection and stdin input
 */
export class SingleRunPanel extends BasePanel<SingleRunPanel> {
  public static currentPanel: SingleRunPanel | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    super(panel, extensionUri, PANEL_CONFIG);
  }

  protected _clearCurrentPanel(): void {
    SingleRunPanel.currentPanel = undefined;
  }

  /**
   * Create or show the panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    if (SingleRunPanel.currentPanel) {
      SingleRunPanel.currentPanel._setTargetDocument(document);
      SingleRunPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = BasePanel._createPanel(PANEL_CONFIG);
    SingleRunPanel.currentPanel = new SingleRunPanel(panel, extensionUri);
    SingleRunPanel.currentPanel._setTargetDocument(document);
  }

  /**
   * Update the target document (called when user switches editors)
   */
  public static updateTargetDocument(document: vscode.TextDocument) {
    if (SingleRunPanel.currentPanel) {
      SingleRunPanel.currentPanel._setTargetDocument(document);
      SingleRunPanel.currentPanel._sendOpenEditors();
    }
  }

  /**
   * Handle messages from webview
   */
  protected async _handleMessage(message: any): Promise<void> {
    // Try common messages first
    if (await this._handleCommonMessage(message)) {
      return;
    }

    // Handle panel-specific messages
    switch (message.command) {
      case "run":
        await this._runCode(message.language, message.input);
        break;
    }
  }

  /**
   * Run code with the given language and input
   */
  private async _runCode(language: string, input: string) {
    const sourceCode = this._getSourceCode();
    if (!sourceCode) {
      return;
    }

    // Show loading state
    this._postMessage({ command: "loading", loading: true });

    try {
      const result = await runAndWait(sourceCode, language, input);
      this._postMessage({
        command: "result",
        result: result,
      });
    } catch (error) {
      this._postMessage({
        command: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this._postMessage({ command: "loading", loading: false });
    }
  }
}
