import React, { useState, useEffect } from "react";
import { DetailsResponse, SUPPORTED_LANGUAGES } from "@/lib/paizaApi";
import { Button, Dropdown, DropdownOption } from "../components";
import type { OpenEditor } from "@/types/OpenEditor";

const vscode = (window as any).acquireVsCodeApi();

const App = () => {
  const [language, setLanguage] = useState("");
  const [stdin, setStdin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetailsResponse | null>(null);
  const [openEditors, setOpenEditors] = useState<OpenEditor[]>([]);
  const [targetFileUri, setTargetFileUri] = useState<string>("");

  useEffect(() => {
    // Handle messages from the extension host
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "loading":
          setIsLoading(message.loading);
          if (message.loading) setError(null);
          break;

        case "result":
          setResult(message.result);
          setError(null);
          break;

        case "error":
          setError(message.error);
          setResult(null);
          break;

        case "setLanguage":
          setLanguage(message.language);
          break;

        case "openEditors":
          setOpenEditors(message.editors);
          if (message.currentUri) {
            setTargetFileUri(message.currentUri);
          }
          break;

        case "setTargetFile":
          setTargetFileUri(message.uri);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    getCurrentLanguage();
    getOpenEditors();

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRun = () => {
    if (vscode) {
      vscode.postMessage({
        command: "run",
        language,
        input: stdin,
      });
    }
  };

  const getCurrentLanguage = () => {
    if (vscode) {
      vscode.postMessage({
        command: "getCurrentLanguage",
      });
    }
  };

  const getOpenEditors = () => {
    if (vscode) {
      vscode.postMessage({
        command: "getOpenEditors",
      });
    }
  };

  const handleTargetFileChange = (
    value: string | DropdownOption | undefined
  ) => {
    if (value && typeof value !== "string") {
      const uri = value.value;
      setTargetFileUri(uri);
      if (vscode) {
        vscode.postMessage({
          command: "setTargetFile",
          uri,
        });
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container">
      <h1>Paiza Runner</h1>

      <div className="w-full flex gap-4">
        <div className="form-group">
          <label htmlFor="target-file-dropdown">Target File</label>
          <Dropdown
            value={targetFileUri}
            className="w-full"
            onChange={handleTargetFileChange}
            options={openEditors.map((editor) => ({
              value: editor.uri,
              label: editor.fileName,
            }))}
            placeholder="Select a file..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="language-dropdown">Language</label>
          <Dropdown
            value={language}
            id="language-dropdown"
            className="w-full"
            onChange={(value) => setLanguage((value as DropdownOption)!.value)}
            options={SUPPORTED_LANGUAGES.map((lang) => ({
              value: lang.id,
              label: lang.label,
            }))}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="stdin">Standard Input (stdin)</label>
        <textarea
          id="stdin"
          placeholder="Enter input data here..."
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
        />
      </div>

      <Button disabled={isLoading} onClick={handleRun}>
        Run Code
      </Button>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="loading active">
          <div className="spinner"></div>
          <span>Running on Paiza.io...</span>
        </div>
      )}

      {/* General Error Message */}
      {error && <div className="error-message active">{error}</div>}

      {/* Execution Results */}
      {result && (
        <div className="result-section">
          <div className="result-header">
            <span className="result-title">Execution Result</span>
            <span className="result-stats">
              Time: {(result.time * 1000).toFixed(0)}ms | Memory:{" "}
              {formatBytes(result.memory)}
            </span>
          </div>
          <span className={`status-badge ${result.result}`}>
            {result.result}
          </span>

          {/* Standard Output */}
          {result.stdout && (
            <div className="result-box">
              <div className="result-box-header stdout">Standard Output</div>
              <div className="result-content">{result.stdout}</div>
            </div>
          )}

          {/* Standard Error */}
          {result.stderr && (
            <div className="result-box">
              <div className="result-box-header stderr">Standard Error</div>
              <div className="result-content">{result.stderr}</div>
            </div>
          )}

          {/* Build Error */}
          {result.build_stderr && result.build_result !== "success" && (
            <div className="result-box">
              <div className="result-box-header build-error">Build Error</div>
              <div className="result-content">{result.build_stderr}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
