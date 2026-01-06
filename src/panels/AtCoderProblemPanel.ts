import * as vscode from "vscode";
import { BasePanel, PanelConfig } from "./BasePanel";
import { scrapeAtCoder } from "../lib/scrapeAtCoder";
import { AtCoderProblem } from "../lib/scrapeAtCoder";

const PANEL_CONFIG: PanelConfig = {
  viewType: "atCoderProblem",
  title: "Loading...",
  webviewJsPath: ["dist", "atCoderProblemWebview.js"],
};

export class AtCoderProblemPanel extends BasePanel<AtCoderProblemPanel> {
  public static currentPanel: AtCoderProblemPanel | undefined;
  private static _problem: AtCoderProblem | null = null;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    problem: AtCoderProblem
  ) {
    super(panel, extensionUri, PANEL_CONFIG);
    AtCoderProblemPanel._problem = problem;
  }

  protected _clearCurrentPanel(): void {
    AtCoderProblemPanel.currentPanel = undefined;
  }

  /**
   * Create or show the panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    if (AtCoderProblemPanel.currentPanel) {
      AtCoderProblemPanel.currentPanel._setTargetDocument(document);
      AtCoderProblemPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const result = await vscode.window.showInputBox({
      placeHolder: "https://atcoder.jp/contests/.../tasks/...",
      prompt: "Enter AtCoder contest task URL",
      password: false,
    });

    if (!result) {
      return;
    }

    try {
      const problems = await scrapeAtCoder(result);
      if (!problems) {
        return;
      }

      // TODO: switch language by user setting
      const panel = BasePanel._createPanel(PANEL_CONFIG);
      panel.title = problems.problemJp.id;
      AtCoderProblemPanel.currentPanel = new AtCoderProblemPanel(
        panel,
        extensionUri,
        problems.problemJp
      );

      AtCoderProblemPanel.currentPanel._setTargetDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
    }
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
      case "getProblem":
        this._postMessage({
          command: "setProblem",
          problem: AtCoderProblemPanel._problem,
        });
        break;

      case "openLink":
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
    }
  }
}
