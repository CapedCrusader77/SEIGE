import { memo, useEffect, useRef } from "react";
import { motion as Motion } from "framer-motion";
import useSiegeStore from "../store/siegeStore";

const TerminalPanel = memo(function TerminalPanel() {
  const logs = useSiegeStore(s => s.logs);
  const clearLogs = useSiegeStore(s => s.clearLogs);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="terminal-panel">
      <div className="panel-header">
        <div className="header-left">
          <div className="terminal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 17l6-6-6-6" />
              <path d="M12 19h8" />
            </svg>
          </div>
          <span>LIVE AUDIT LOG</span>
        </div>
        <button className="clear-logs-btn" onClick={clearLogs}>
          CLEAR
        </button>
      </div>

      <div className="terminal-scroller" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="terminal-empty">WAITING FOR COMPROMISE VECTOR...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`terminal-line ${log.type || "info"}`}>
              <span className="line-time">[{log.timestamp}]</span>
              <span className="line-tag">[{log.tag}]</span>
              <span className="line-text">{log.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="terminal-footer">
        <div className="footer-status">
          <span className="status-dot pulsing" />
          CONNECTION SECURE
        </div>
        <div className="footer-meta">UTF-8 // AES-256-GCM</div>
      </div>
    </div>
  );
});

export default TerminalPanel;
