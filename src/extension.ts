import * as vscode from "vscode";

import { SingleRunPanel } from "@/panels/SingleRunPanel";
import { MultiTestPanel } from "@/panels/MultiTestPanel";

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
      }
    }
  );

  // Register the run command
  const runCommand = vscode.commands.registerCommand("paiza-runner.run", () => {
    const editor = lastActiveEditor || vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "Paiza Runner: No active editor found. Please open a file first."
      );
      return;
    }

    const document = editor.document;
    if (!document.getText().trim()) {
      vscode.window.showWarningMessage(
        "Paiza Runner: The current file is empty."
      );
      return;
    }

    // Open the WebView panel with document reference
    SingleRunPanel.createOrShow(context.extensionUri, document);
  });

  // Register the run multiple test cases command
  const runMultipleCommand = vscode.commands.registerCommand(
    "paiza-runner.runMultiple",
    () => {
      const editor = lastActiveEditor || vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          "Paiza Runner: No active editor found. Please open a file first."
        );
        return;
      }

      const document = editor.document;
      if (!document.getText().trim()) {
        vscode.window.showWarningMessage(
          "Paiza Runner: The current file is empty."
        );
        return;
      }

      // Open the Multi-Test WebView panel with document reference
      MultiTestPanel.createOrShow(context.extensionUri, document);
    }
  );

  context.subscriptions.push(
    editorChangeListener,
    runCommand,
    runMultipleCommand
  );
}

export function deactivate() {}
