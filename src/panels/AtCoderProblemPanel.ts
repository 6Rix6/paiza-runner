import * as vscode from "vscode";
import { BasePanel, PanelConfig } from "./BasePanel";
import { scrapeAtCoder } from "../lib/scrapeAtCoder";
import { AtCoderProblem } from "../lib/scrapeAtCoder";
import { runAndWait } from "../lib/paizaApi";

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
      const problem = await scrapeAtCoder(result);
      if (!problem) {
        return;
      }

      const panel = BasePanel._createPanel(PANEL_CONFIG);
      panel.title = problem.id;
      AtCoderProblemPanel.currentPanel = new AtCoderProblemPanel(
        panel,
        extensionUri,
        problem
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

      case "runAll":
        await this._runAllTestCases(message.language);
        break;
    }
  }

  /**
   * Run all test cases from problem samples in parallel
   */
  private async _runAllTestCases(language: string) {
    const problem = AtCoderProblemPanel._problem;
    if (!problem || !problem.samples || problem.samples.length === 0) {
      this._postMessage({
        command: "error",
        error: "No test cases available",
      });
      return;
    }

    const sourceCode = this._getSourceCode();
    if (!sourceCode) {
      return;
    }

    // Show loading state
    this._postMessage({ command: "loading", loading: true });

    try {
      // Create promises for all test cases
      const promises = problem.samples.map(async (sample, index) => {
        // Notify that this test case is running
        this._postMessage({
          command: "testCaseStatus",
          index,
          status: "running",
        });

        try {
          const result = await runAndWait(sourceCode, language, sample.input);

          // Check if output matches expected
          let verdict: "AC" | "WA" | "RE" | "CE" | null = null;
          const expectedOutput = sample.output.trim();
          if (expectedOutput !== "") {
            const actualOutput = result.stdout.trim();
            if (result.result === "success") {
              verdict = actualOutput === expectedOutput ? "AC" : "WA";
            } else if (result.build_result === "failure") {
              verdict = "CE";
            } else {
              verdict = "RE";
            }
          }

          return {
            index,
            input: sample.input,
            expectedOutput: sample.output,
            result,
            status: "completed" as const,
            verdict,
          };
        } catch (error) {
          return {
            index,
            input: sample.input,
            expectedOutput: sample.output,
            result: null,
            error: error instanceof Error ? error.message : String(error),
            status: "error" as const,
            verdict: null,
          };
        }
      });

      // Wait for all test cases to complete
      const results = await Promise.all(promises);

      // Send all results
      this._postMessage({
        command: "allResults",
        results,
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
