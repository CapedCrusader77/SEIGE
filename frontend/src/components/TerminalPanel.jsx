import { memo, useEffect, useRef } from "react";
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
    <div className="terminal-shell">
      <div className="panel-frame terminal-frame">
        <div className="terminal-panel-wrapper">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot red" />
              <span className="terminal-dot amber" />
              <span className="terminal-dot green" />
            </div>
            <div className="terminal-header-title">LIVE AUDIT LOG</div>
            <div className="terminal-header-actions">
              <button className="terminal-action" onClick={clearLogs}>CLEAR</button>
            </div>
          </div>

          <div className="terminal-panel" ref={scrollRef}>
            <div className="terminal-content">
              {logs.length === 0 ? (
                <div className="terminal-empty">WAITING FOR COMPROMISE VECTOR...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="terminal-line">
                    <span className="timestamp">[{log.timestamp}]</span>
                    <span className={`tag ${log.type || "info"}`}>{log.tag}</span>
                    <span className="terminal-text">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="terminal-footer">
            <div className="terminal-footer-prompt">&gt;_ sys.listen()</div>
            <div className="terminal-footer-bar">CONNECTION SECURE</div>
            <span>UTF-8 // AES-256-GCM</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TerminalPanel;
