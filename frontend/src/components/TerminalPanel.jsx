/* UI overhaul: rebuilt the terminal into a faux OS console with a decorative title bar, wipe-clear animation, structured log columns, and footer prompt telemetry. */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import gsap from "gsap";

const RESULT_TOKENS = ["OPEN", "CLOSED", "CRACKED", "BLOCKED", "INJECTED", "FAILED", "CRASHED", "OVERLOADING", "EXFILTRATED", "COMPLETED", "STARTED", "TARGETED", "SCANNING", "SUCCESS"];

const extractResult = (log) => {
  const combined = `${log.tag} ${log.text}`.toUpperCase();
  const match = RESULT_TOKENS.find((token) => combined.includes(token));
  return match ?? log.type.toUpperCase();
};

function AnimatedLogLine({ log, isLast }) {
  const result = useMemo(() => extractResult(log), [log]);

  return (
    <Motion.div
      className="terminal-line"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <span className="timestamp">{log.timestamp}</span>
      <span className={`tag ${log.type}`}>[{log.tag}]</span>
      <span className="terminal-text">
        {log.text}
        {isLast ? <span className="terminal-cursor">█</span> : null}
      </span>
      <span className={`terminal-result terminal-result-${result.toLowerCase()}`}>{result}</span>
    </Motion.div>
  );
}

export default function TerminalPanel({ logs, onClear, onExport, isExporting = false }) {
  const terminalRef = useRef(null);
  const contentRef = useRef(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const handleClear = () => {
    if (isClearing || !contentRef.current) return;
    setIsClearing(true);

    gsap.fromTo(
      contentRef.current,
      { clipPath: "inset(0 0 0% 0)", opacity: 1 },
      {
        clipPath: "inset(100% 0 0% 0)",
        opacity: 0.4,
        duration: 0.22,
        ease: "power2.in",
        onComplete: () => {
          onClear?.();
          gsap.set(contentRef.current, { clipPath: "inset(0 0 100% 0)" });
          gsap.to(contentRef.current, {
            clipPath: "inset(0 0 0% 0)",
            opacity: 1,
            duration: 0.24,
            ease: "power2.out",
            onComplete: () => setIsClearing(false),
          });
        },
      },
    );
  };

  return (
    <div className="terminal-panel-wrapper">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="terminal-dot red" />
          <span className="terminal-dot amber" />
          <span className="terminal-dot green" />
        </div>
        <div className="terminal-header-title">SIEGE TERMINAL v2.0</div>
        <div className="terminal-header-actions">
          <button type="button" className="terminal-action" onClick={handleClear}>
            CLEAR
          </button>
          <button type="button" className="terminal-action" onClick={onExport} disabled={isExporting}>
            {isExporting ? "BUILDING" : "EXPORT"}
          </button>
        </div>
      </div>

      <div ref={terminalRef} className="terminal-panel">
        <div ref={contentRef} className="terminal-content">
          <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <Motion.div
                key="empty"
                className="terminal-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                SYSTEM IDLE. AWAITING INSTRUCTION...
              </Motion.div>
            ) : (
              logs.map((log, index) => (
                <AnimatedLogLine
                  key={`${log.timestamp}-${index}-${log.text}`}
                  log={log}
                  isLast={index === logs.length - 1}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="terminal-footer">
        <span className="terminal-footer-prompt">root@siege:~$</span>
        <span className="terminal-footer-bar">░░░░░░░░░░░░░░░░</span>
        <span>LINES: {logs.length}</span>
        <span>STATUS: {logs.length ? "STREAMING" : "IDLE"}</span>
      </div>
    </div>
  );
}
