import { memo, useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import useSiegeStore from "../store/siegeStore";
import useZeroDay from "../hooks/useZeroDay";
import { generateSessionReport } from "../utils/reportGenerator";

const ZeroDayComplete = memo(function ZeroDayComplete() {
  const zeroDayPhase = useSiegeStore(s => s.zeroDayPhase);
  const stats = useSiegeStore(s => s.zeroDayStats);
  const attacksCount = useSiegeStore(s => s.attacksCount);
  const successCount = useSiegeStore(s => s.successCount);
  const blockedCount = useSiegeStore(s => s.blockedCount);
  const compromisedNodeIdsSet = useSiegeStore(s => s.compromisedNodeIds);
  const compromisedNodeIds = Array.from(compromisedNodeIdsSet);
  const securityScore = useSiegeStore(s => s.securityScore);
  const sessionEvents = useSiegeStore(s => s.sessionEvents);
  const firewallEnabled = useSiegeStore(s => s.firewallEnabled);
  const idsEnabled = useSiegeStore(s => s.idsEnabled);
  const historyEvents = useSiegeStore(s => s.historyEvents);
  const securityScoreTimeline = useSiegeStore(s => s.securityScoreTimeline);
  const zeroDayTimelineEntries = useSiegeStore(s => s.zeroDayTimelineEntries);
  const isExporting = useSiegeStore(s => s.isExporting);
  const setIsExporting = useSiegeStore(s => s.setIsExporting);
  const sessionStartTime = useSiegeStore(s => s.sessionStartTime);
  const { handleResetSystem } = useZeroDay();

  const [displayStats, setDisplayStats] = useState({
    nodes_compromised: 0,
    credentials_stolen: 0,
    firewall_rules_bypassed: 0,
    detection_evasions: 0,
  });
  const [threatProgress, setThreatProgress] = useState(0);

  const visible = zeroDayPhase === "complete";

  useEffect(() => {
    if (!visible) return;

    const counterState = {
      nodes_compromised: 0,
      credentials_stolen: 0,
      firewall_rules_bypassed: 0,
      detection_evasions: 0,
      threat: 0,
    };
    const timeline = gsap.timeline();

    const updateStats = () => {
      setDisplayStats({
        nodes_compromised: Math.round(counterState.nodes_compromised),
        credentials_stolen: Math.round(counterState.credentials_stolen),
        firewall_rules_bypassed: Math.round(counterState.firewall_rules_bypassed),
        detection_evasions: Math.round(counterState.detection_evasions),
      });
    };

    timeline
      .to(counterState, { nodes_compromised: stats.nodes_compromised, duration: 0.6, ease: "power2.out", onUpdate: updateStats })
      .to(counterState, { credentials_stolen: stats.credentials_stolen, duration: 0.8, ease: "power2.out", onUpdate: updateStats }, "+=0.1")
      .to(counterState, { firewall_rules_bypassed: stats.firewall_rules_bypassed, duration: 0.6, ease: "power2.out", onUpdate: updateStats }, "+=0.1")
      .to(counterState, { detection_evasions: stats.detection_evasions, duration: 0.6, ease: "power2.out", onUpdate: updateStats }, "+=0.1")
      .to(counterState, { threat: 1, duration: 1.2, ease: "power2.inOut", onUpdate: () => setThreatProgress(counterState.threat) }, "-=0.2");

    return () => { timeline.kill(); };
  }, [visible, stats]);

  if (!visible) return null;

  const handleExportClassifiedReport = async () => {
    try {
      setIsExporting(true);
      await new Promise((resolve) => window.setTimeout(resolve, 80));

      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
      const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
      const seconds = String(elapsedSeconds % 60).padStart(2, "0");

      generateSessionReport({
        attacksCount,
        successCount,
        blockedCount,
        compromisedNodeIds,
        securityScore,
        sessionEvents,
        firewallEnabled,
        idsEnabled,
        historyEvents,
        securityScoreTimeline,
        zeroDayExecuted: true,
        zeroDayStats: stats,
        zeroDayTimeline: zeroDayTimelineEntries,
        sessionTime: `${hours}:${minutes}:${seconds}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <Motion.div
        className="zero-day-complete"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="zero-day-complete-card complete-content">
          <div className="zero-day-complete-header complete-header">
            <span className="header-status zero-day-complete-cve">ALL SYSTEMS COMPROMISED</span>
            <h2 className="header-title">SIEGE_COMPLETE</h2>
            <div className="zero-day-complete-divider" />
          </div>

          <div className="zero-day-stats-table complete-stats">
            <div className="stat-row">
              <span className="stat-label">NODES COMPROMISED</span>
              <span className="stat-dots">................</span>
              <span className="stat-value">{displayStats.nodes_compromised} / 5</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">CREDENTIALS EXFILTRATED</span>
              <span className="stat-dots">................</span>
              <span className="stat-value">{displayStats.credentials_stolen}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">FIREWALL RULES BYPASSED</span>
              <span className="stat-dots">................</span>
              <span className="stat-value">{displayStats.firewall_rules_bypassed}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">DETECTION EVASIONS</span>
              <span className="stat-dots">................</span>
              <span className="stat-value">{displayStats.detection_evasions}</span>
            </div>
          </div>

          <div className="zero-day-threat-wrap complete-threat-level">
            <div className="threat-header">
              <span>CURRENT THREAT LEVEL</span>
              <span className="level">OMEGA</span>
            </div>
            <div className="zero-day-threat-bar">
              <span style={{ width: `${threatProgress * 100}%` }} />
            </div>
          </div>

          <div className="zero-day-actions complete-actions">
            <button type="button" className="zero-day-action-button reset" onClick={handleResetSystem}>
              RESET SYSTEM
            </button>
            <button type="button" className="zero-day-action-button report" onClick={handleExportClassifiedReport} disabled={isExporting}>
              {isExporting ? "GENERATING CLASSIFIED REPORT" : "EXPORT CLASSIFIED REPORT"}
            </button>
          </div>
        </div>
      </Motion.div>
    </AnimatePresence>
  );
});

export default ZeroDayComplete;
