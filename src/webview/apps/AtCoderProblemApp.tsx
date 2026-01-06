import React, { useEffect, useRef, useState } from "react";
import { AtCoderProblem } from "../../lib/scrapeAtCoder";
import { Divider } from "../components/Divider";
import { Button } from "../components";
import { BoxArrowUpRight } from "../components/icons/BoxArrowUpRight";
import "katex/dist/katex.min.css";
import katex from "katex";

const vscode = (window as any).acquireVsCodeApi();

const AtCoderProblemApp = () => {
  const [problem, setProblem] = useState<AtCoderProblem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "setProblem":
          setProblem(message.problem);
          break;
      }
    };
    window.addEventListener("message", handleMessage);

    getProblem();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      // render inline tex
      const varElements = containerRef.current.querySelectorAll("var");

      varElements.forEach((element) => {
        const tex = element.textContent || "";
        try {
          katex.render(tex, element, {
            throwOnError: false,
            displayMode: false,
          });
        } catch (error) {
          console.error("KaTeX rendering error:", error);
        }
      });
    }
  }, [problem]);

  const getProblem = () => {
    if (vscode) {
      vscode.postMessage({
        command: "getProblem",
      });
    }
  };

  const openLink = () => {
    if (vscode && problem?.url) {
      vscode.postMessage({
        command: "openLink",
        url: problem.url,
      });
    }
  };

  return problem?.bodyHtml ? (
    <div className="p-5 ">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <p className="text-primary">{problem.executeConstraints}</p>
        </div>
        <Button onClick={openLink} className="gap-2">
          <BoxArrowUpRight />
          <span className="hidden sm:block">Open in Browser</span>
        </Button>
      </div>
      <Divider />
      <div
        ref={containerRef}
        className="prose"
        dangerouslySetInnerHTML={{ __html: problem.bodyHtml }}
      />
    </div>
  ) : (
    <></>
  );
};

export default AtCoderProblemApp;
