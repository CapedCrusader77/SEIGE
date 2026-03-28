import { memo } from "react";
import { motion as Motion } from "framer-motion";
import useSiegeStore from "../store/siegeStore";

const AnalyticsPanel = memo(function AnalyticsPanel() {
  const store = useSiegeStore();
  
  // Extract state from store
  const attacksCount = store.attacksCount;
  const successCount = store.successCount;
  const blockedCount = store.blockedCount;
  const compromisedNodeIds = store.compromisedNodeIds;
  const attackHistory = store.attackHistory || [];
  const securityScoreTimeline = store.securityScoreTimeline || [];
  const breachTimes = store.breachTimes || [];

  return (
    <div className="analytics-panel">
      <div className="analytics-header">
        <div className="header-label">
          <span className="label-dot" />
          SESSION PERFORMANCE TELEMETRY
        </div>
        <div className="header-time">v.0.8.2 // STABLE</div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card stat-summary">
          <div className="card-title">PRIMARY METRICS</div>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="item-label">TOTAL SEQUENCES</span>
              <span className="item-value">{attacksCount}</span>
            </div>
            <div className="stat-item">
              <span className="item-label">NODE COMPROMISES</span>
              <span className="item-value">{successCount}</span>
            </div>
            <div className="stat-item">
              <span className="item-label">BLOCKED VECTORS</span>
              <span className="item-value">{blockedCount}</span>
            </div>
            <div className="stat-item">
              <span className="item-label">TOTAL BREACH RATE</span>
              <span className="item-value">
                {attacksCount > 0 ? Math.round((successCount / attacksCount) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="analytics-card timeline-chart">
          <div className="card-title">BREACH TIMELINE</div>
          <div className="timeline-container">
            {breachTimes.length === 0 ? (
              <div className="timeline-empty">NO RELEVANT EVENTS LOGGED</div>
            ) : (
              breachTimes.map((event, i) => (
                <div key={i} className={`timeline-event ${event.attack.toLowerCase()}`}>
                  <span className="event-time">+{Math.round((event.timestamp - store.sessionStartTime) / 1000)}s</span>
                  <span className="event-type">[{event.attack}]</span>
                  <span className="event-target">{event.nodeId || "SYSTEM"} COMPROMISED</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analytics-card history-log">
          <div className="card-title">ATTACK HISTORY</div>
          <div className="history-container">
            {attackHistory.slice(-10).reverse().map((attack, i) => (
              <div key={i} className={`history-item ${attack.success ? "success" : "failed"}`}>
                <div className="history-header">
                  <span className="history-type">TYPE: {attack.type.toUpperCase()}</span>
                  <span className="history-status">{attack.success ? "PENETRATION SUCCESS" : "BLOCKED"}</span>
                </div>
                <div className="history-meta">
                  <span>START: {new Date(attack.startTime).toLocaleTimeString()}</span>
                  <span>DURATION: {attack.endTime ? Math.round((attack.endTime - attack.startTime) / 1000) : "N/A"}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AnalyticsPanel;
