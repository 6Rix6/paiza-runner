import * as vscode from "vscode";
import { runAndWait, DetailsResponse } from "../lib/paizaApi";
import { BasePanel, PanelConfig } from "./BasePanel";
import scrapeAtCoder from "../lib/scrapeAtCoder";

/**
 * Test case result for parallel execution
 */
export interface TestCaseResult {
  index: number;
  input: string;
  expectedOutput?: string;
  result: DetailsResponse | null;
  error?: string;
  status: "pending" | "running" | "completed" | "error";
}

const PANEL_CONFIG: PanelConfig = {
  viewType: "paizaMultiTest",
  title: "Paiza Multi-Test Runner",
  webviewJsPath: ["dist", "multiTestWebview.js"],
};

/**
 * WebView Panel for Multi-Test Case Runner
 * Provides GUI for running multiple test cases in parallel
 */
export class MultiTestPanel extends BasePanel<MultiTestPanel> {
  public static currentPanel: MultiTestPanel | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    super(panel, extensionUri, PANEL_CONFIG);
  }

  protected _clearCurrentPanel(): void {
    MultiTestPanel.currentPanel = undefined;
  }

  /**
   * Create or show the panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    if (MultiTestPanel.currentPanel) {
      MultiTestPanel.currentPanel._setTargetDocument(document);
      MultiTestPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = BasePanel._createPanel(PANEL_CONFIG);
    MultiTestPanel.currentPanel = new MultiTestPanel(panel, extensionUri);
    MultiTestPanel.currentPanel._setTargetDocument(document);
  }

  /**
   * Update the target document (called when user switches editors)
   */
  public static updateTargetDocument(document: vscode.TextDocument) {
    if (MultiTestPanel.currentPanel) {
      MultiTestPanel.currentPanel._setTargetDocument(document);
      MultiTestPanel.currentPanel._sendOpenEditors();
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
      case "runAll":
        await this._runAllTestCases(message.language, message.testCases);
        break;

      case "addTestCasesFromAtCoder":
        await this._addTestCasesFromAtCoder();
        break;
    }
  }

  /**
   * Run all test cases in parallel
   */
  private async _runAllTestCases(
    language: string,
    testCases: { input: string; expectedOutput?: string }[]
  ) {
    const sourceCode = this._getSourceCode();
    if (!sourceCode) {
      return;
    }

    // Show loading state
    this._postMessage({ command: "loading", loading: true });

    try {
      // Create promises for all test cases
      const promises = testCases.map(async (testCase, index) => {
        // Notify that this test case is running
        this._postMessage({
          command: "testCaseStatus",
          index,
          status: "running",
        });

        try {
          const result = await runAndWait(sourceCode, language, testCase.input);

          // Check if output matches expected (if provided)
          let verdict: "AC" | "WA" | "RE" | "CE" | null = null;
          if (
            testCase.expectedOutput !== undefined &&
            testCase.expectedOutput.trim() !== ""
          ) {
            const actualOutput = result.stdout.trim();
            const expectedOutput = testCase.expectedOutput.trim();
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
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            result,
            status: "completed" as const,
            verdict,
          };
        } catch (error) {
          return {
            index,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
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

  /**
   * Add test cases from AtCoder problem page
   */
  private async _addTestCasesFromAtCoder() {
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

      this._postMessage({
        command: "addTestCases",
        testCases: problems.problemJp.samples,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
