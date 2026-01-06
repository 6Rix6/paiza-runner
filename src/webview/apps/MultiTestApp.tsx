import React, { useState, useEffect } from "react";
import { SUPPORTED_LANGUAGES } from "../../lib/paizaApi";
import { Button, Dropdown, DropdownOption } from "../components";
import { SampleInput } from "../../lib/scrapeAtCoder";
import { TestCaseResult } from "../../panels/MultiTestPanel";
import type { OpenEditor } from "../../types/OpenEditor";
import { Plus } from "../components/icons/Plus";
import { Link45Deg } from "../components/icons/Link45Deg";

const vscode = (window as any).acquireVsCodeApi();

interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
}

const MultiTestApp = () => {
  const [language, setLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openEditors, setOpenEditors] = useState<OpenEditor[]>([]);
  const [targetFileUri, setTargetFileUri] = useState<string>("");
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 1, input: "", expectedOutput: "" },
  ]);
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [runningIndices, setRunningIndices] = useState<Set<number>>(new Set());
  const [nextId, setNextId] = useState(2);

  useEffect(() => {
    // Handle messages from the extension host
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "loading":
          setIsLoading(message.loading);
          if (message.loading) {
            setError(null);
            setResults([]);
          }
          break;

        case "testCaseStatus":
          setRunningIndices((prev) => {
            const next = new Set(prev);
            if (message.status === "running") {
              next.add(message.index);
            } else {
              next.delete(message.index);
            }
            return next;
          });
          break;

        case "allResults":
          setResults(message.results);
          setRunningIndices(new Set());
          break;

        case "error":
          setError(message.error);
          setResults([]);
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

        case "addTestCases":
          addTestCasesFromAtCoder(message.testCases as SampleInput[]);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    getCurrentLanguage();
    getOpenEditors();

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRunAll = () => {
    if (vscode) {
      vscode.postMessage({
        command: "runAll",
        language,
        testCases: testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
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

  const addTestCase = () => {
    setTestCases([...testCases, { id: nextId, input: "", expectedOutput: "" }]);
    setNextId(nextId + 1);
  };

  const addTestCasesFromAtCoder = (cases: SampleInput[]) => {
    if (cases.length === 0) return;
    const newCases: TestCase[] = [];
    for (let i = 0; i < cases.length; i++) {
      const tc = cases[i];
      newCases.push({
        id: nextId + i,
        input: tc.input,
        expectedOutput: tc.output,
      });
    }
    setTestCases(newCases);
    setResults([]);
    setNextId(nextId + cases.length);
  };

  const removeTestCase = (id: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((tc) => tc.id !== id));
    }
  };

  const updateTestCase = (
    id: number,
    field: "input" | "expectedOutput",
    value: string
  ) => {
    setTestCases(
      testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  const handleAddTestCasesFromAtCoder = () => {
    if (vscode) {
      vscode.postMessage({
        command: "addTestCasesFromAtCoder",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getVerdictClass = (verdict: string | null) => {
    switch (verdict) {
      case "AC":
        return "verdict-ac";
      case "WA":
        return "verdict-wa";
      case "RE":
        return "verdict-re";
      case "CE":
        return "verdict-ce";
      default:
        return "";
    }
  };

  const getSummary = () => {
    if (results.length === 0) return null;
    const ac = results.filter((r) => r.verdict === "AC").length;
    const total = results.length;
    const allPassed = ac === total && results.every((r) => r.verdict === "AC");
    return { ac, total, allPassed };
  };

  const summary = getSummary();

  return (
    <div className="container">
      <h1>Paiza Multi-Test Runner</h1>

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

      {/* Test Cases */}
      <div className="test-cases-section">
        <div className="test-cases-header">
          <h2>Test Cases</h2>
          <div className="flex gap-2">
            <Button onClick={addTestCase} className="add-btn">
              <Plus />
            </Button>
            <Button onClick={handleAddTestCasesFromAtCoder}>
              <Link45Deg />
            </Button>
          </div>
        </div>

        {testCases.map((testCase, index) => (
          <div key={testCase.id} className="test-case-card">
            <div className="test-case-header">
              <span className="test-case-number">Test Case #{index + 1}</span>
              {runningIndices.has(index) && (
                <span className="running-badge">Running...</span>
              )}
              {results[index] && (
                <span
                  className={`verdict-badge ${getVerdictClass(
                    results[index].verdict
                  )}`}
                >
                  {results[index].verdict || results[index].result?.result}
                </span>
              )}
              <button
                className="remove-btn"
                onClick={() => removeTestCase(testCase.id)}
                disabled={testCases.length === 1}
              >
                ×
              </button>
            </div>

            <div className="test-case-inputs">
              <div className="input-group">
                <label>Input (stdin)</label>
                <textarea
                  value={testCase.input}
                  onChange={(e) =>
                    updateTestCase(testCase.id, "input", e.target.value)
                  }
                  placeholder="Enter input..."
                  rows={3}
                />
              </div>
              <div className="input-group">
                <label>Expected Output (optional)</label>
                <textarea
                  value={testCase.expectedOutput}
                  onChange={(e) =>
                    updateTestCase(
                      testCase.id,
                      "expectedOutput",
                      e.target.value
                    )
                  }
                  placeholder="Enter expected output for AC/WA check..."
                  rows={3}
                />
              </div>
            </div>

            {/* Result for this test case */}
            {results[index] && results[index].result && (
              <div className="test-case-result">
                <div className="result-stats">
                  Time: {(results[index].result!.time * 1000).toFixed(0)}ms |
                  Memory: {formatBytes(results[index].result!.memory)}
                </div>
                {results[index].result!.stdout && (
                  <div className="result-output">
                    <strong>Output:</strong>
                    <pre>{results[index].result!.stdout}</pre>
                  </div>
                )}
                {results[index].result!.stderr && (
                  <div className="result-stderr">
                    <strong>Stderr:</strong>
                    <pre>{results[index].result!.stderr}</pre>
                  </div>
                )}
                {results[index].result!.build_stderr &&
                  results[index].result!.build_result !== "success" && (
                    <div className="result-build-error">
                      <strong>Build Error:</strong>
                      <pre>{results[index].result!.build_stderr}</pre>
                    </div>
                  )}
              </div>
            )}

            {results[index] && results[index].error && (
              <div className="test-case-error">
                Error: {results[index].error}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        disabled={isLoading}
        onClick={handleRunAll}
        className="run-all-btn"
      >
        {isLoading ? "Running..." : `Run All Tests (${testCases.length})`}
      </Button>

      {/* Summary */}
      {summary && (
        <div className={`summary-box ${summary.allPassed ? "all-passed" : ""}`}>
          <span className="summary-text">
            Result: {summary.ac} / {summary.total} Passed
          </span>
          {summary.allPassed && (
            <span className="all-ac-badge">All AC! 🎉</span>
          )}
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="loading active">
          <div className="spinner"></div>
          <span>Running {testCases.length} test cases in parallel...</span>
        </div>
      )}

      {/* General Error Message */}
      {error && <div className="error-message active">{error}</div>}
    </div>
  );
};

export default MultiTestApp;
