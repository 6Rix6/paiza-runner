import * as vscode from "vscode";
import { BasePanel, PanelConfig } from "./BasePanel";
import { requireContest, requireTask } from "../lib/scrapeAtCoder";
import { AtCoderProblem } from "../lib/scrapeAtCoder";
import { runAndWait } from "../lib/paizaApi";

const PANEL_CONFIG: PanelConfig = {
  viewType: "atCoderProblem",
  title: "",
  webviewJsPath: ["dist", "atCoderProblemWebview.js"],
};

export class AtCoderProblemPanel extends BasePanel<AtCoderProblemPanel> {
  public static currentPanel: AtCoderProblemPanel | undefined;
  private static _panels: Map<string, AtCoderProblemPanel> = new Map();
  private _problem: AtCoderProblem;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    problem: AtCoderProblem
  ) {
    super(panel, extensionUri, PANEL_CONFIG);
    this._problem = problem;
    AtCoderProblemPanel._panels.set(problem.id, this);
  }

  protected _clearCurrentPanel(): void {
    AtCoderProblemPanel._panels.delete(this._problem.id);
    if (AtCoderProblemPanel.currentPanel === this) {
      AtCoderProblemPanel.currentPanel = undefined;
    }
  }

  /**
   * Create or show the panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    const problem = await requireTask();
    if (!problem) {
      return;
    }

    this._createOrShowPanel(extensionUri, document, problem, undefined, true);
  }

  /**
   * Create multiple panels from AtCoder contest
   */
  public static async createFromContest(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    let firstPanelId: string | null = null;
    await requireContest((index, problem) => {
      if (!firstPanelId) {
        firstPanelId = problem.id;
      }
      const viewColumn = !index
        ? vscode.ViewColumn.Beside
        : vscode.ViewColumn.Active;
      this._createOrShowPanel(
        extensionUri,
        document,
        problem,
        viewColumn,
        !!index
      );
      // if (!!index && firstPanelId) {
      //   const existingPanel = AtCoderProblemPanel._panels.get(firstPanelId);
      //   if (existingPanel) {
      //     existingPanel._panel.reveal(viewColumn ?? vscode.ViewColumn.Beside);
      //     existingPanel._setTargetDocument(document);
      //     AtCoderProblemPanel.currentPanel = existingPanel;
      //   }
      // }
    });
  }

  private static _createOrShowPanel(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument,
    problem: AtCoderProblem,
    viewColumn?: vscode.ViewColumn,
    preserveFocus?: boolean
  ) {
    // Check if a panel for this problem already exists
    const existingPanel = AtCoderProblemPanel._panels.get(problem.id);
    if (existingPanel) {
      existingPanel._panel.reveal(viewColumn ?? vscode.ViewColumn.Beside);
      existingPanel._setTargetDocument(document);
      AtCoderProblemPanel.currentPanel = existingPanel;
      return;
    }

    const panel = BasePanel._createPanel(
      PANEL_CONFIG,
      viewColumn,
      preserveFocus
    );
    panel.title = problem.id;
    AtCoderProblemPanel.currentPanel = new AtCoderProblemPanel(
      panel,
      extensionUri,
      problem
    );

    AtCoderProblemPanel.currentPanel._setTargetDocument(document);
  }

  /**
   * Update the target document (called when user switches editors)
   */
  public static updateTargetDocument(document: vscode.TextDocument) {
    // Update all open panels
    for (const panel of AtCoderProblemPanel._panels.values()) {
      panel._setTargetDocument(document);
      panel._sendOpenEditors();
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
          problem: this._problem,
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
    const problem = this._problem;
    if (!problem.samples || problem.samples.length === 0) {
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
