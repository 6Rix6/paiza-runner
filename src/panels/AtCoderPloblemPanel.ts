import * as vscode from "vscode";
import { BasePanel, PanelConfig } from "./BasePanel";

const PANEL_CONFIG: PanelConfig = {
  viewType: "atCoderProblem",
  title: "AtCoder Problem Selector",
  webviewJsPath: ["dist", "atCoderProblemWebview.js"],
};

export class AtCoderProblemPanel extends BasePanel<AtCoderProblemPanel> {
  public static currentPanel: AtCoderProblemPanel | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    super(panel, extensionUri, PANEL_CONFIG);
  }

  protected _clearCurrentPanel(): void {
    AtCoderProblemPanel.currentPanel = undefined;
  }

  /**
   * Create or show the panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    if (AtCoderProblemPanel.currentPanel) {
      AtCoderProblemPanel.currentPanel._setTargetDocument(document);
      AtCoderProblemPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = BasePanel._createPanel(PANEL_CONFIG);
    AtCoderProblemPanel.currentPanel = new AtCoderProblemPanel(
      panel,
      extensionUri
    );
    AtCoderProblemPanel.currentPanel._setTargetDocument(document);
  }

  /**
   * Update the target document (called when user switches editors)
   */
  public static updateTargetDocument(document: vscode.TextDocument) {
    if (AtCoderProblemPanel.currentPanel) {
      AtCoderProblemPanel.currentPanel._setTargetDocument(document);
      AtCoderProblemPanel.currentPanel._sendOpenEditors();
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
    }
  }
}
