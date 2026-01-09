import * as vscode from "vscode";

import { SingleRunPanel } from "./panels/SingleRunPanel";
import { MultiTestPanel } from "./panels/MultiTestPanel";
import { AtCoderProblemPanel } from "./panels/AtCoderProblemPanel";
import { APP_CONFIG, COMMANDS } from "./consts/appConfig";

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
  // Track the last active text editor
  let lastActiveEditor = vscode.window.activeTextEditor;

  // Update target document when active editor changes
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        lastActiveEditor = editor;
        SingleRunPanel.updateTargetDocument(editor.document);
        MultiTestPanel.updateTargetDocument(editor.document);
        AtCoderProblemPanel.updateTargetDocument(editor.document);
      }
    }
  );

  // Register the run command
  const runCommand = vscode.commands.registerCommand(COMMANDS.run, () => {
    const document = getDocument(lastActiveEditor);
    if (!document) {
      return;
    }

    // Open the WebView panel with document reference
    SingleRunPanel.createOrShow(context.extensionUri, document);
  });

  // Register the run multiple test cases command
  const runMultipleCommand = vscode.commands.registerCommand(
    COMMANDS.runMultiple,
    () => {
      const document = getDocument(lastActiveEditor);
      if (!document) {
        return;
      }

      // Open the Multi-Test WebView panel with document reference
      MultiTestPanel.createOrShow(context.extensionUri, document);
    }
  );

  // Register the run atcoder problem command
  const runAtCoderProblemCommand = vscode.commands.registerCommand(
    COMMANDS.runAtCoderProblem,
    () => {
      const document = getDocument(lastActiveEditor);
      if (!document) {
        return;
      }

      // Open the AtCoder Problem WebView panel with document reference
      AtCoderProblemPanel.createOrShow(context.extensionUri, document);
    }
  );

  // Register the run atcoder contest command
  const runAtCoderContestCommand = vscode.commands.registerCommand(
    COMMANDS.runAtCoderContest,
    () => {
      const document = getDocument(lastActiveEditor);
      if (!document) {
        return;
      }

      // Open the AtCoder Problem WebView panel with document reference
      AtCoderProblemPanel.createFromContest(context.extensionUri, document);
    }
  );

  context.subscriptions.push(
    editorChangeListener,
    runCommand,
    runMultipleCommand,
    runAtCoderProblemCommand,
    runAtCoderContestCommand
  );
}

export function deactivate() {}

const getDocument = (
  lastActiveEditor: vscode.TextEditor | undefined
): vscode.TextDocument | undefined => {
  const editor = lastActiveEditor || vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage(
      `${APP_CONFIG.appDisplayName}: No active editor found. Please open a file first.`
    );
    return;
  }

  const document = editor.document;
  if (!document.getText().trim()) {
    vscode.window.showWarningMessage(
      `${APP_CONFIG.appDisplayName}: The current file is empty.`
    );
    return;
  }

  return document;
};
