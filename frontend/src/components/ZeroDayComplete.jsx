import { memo, useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import useSiegeStore from "../store/siegeStore";
import useZeroDay from "../hooks/useZeroDay";

const ZeroDayComplete = memo(function ZeroDayComplete() {
  const zeroDayPhase = useSiegeStore(s => s.zeroDayPhase);
  const stats = useSiegeStore(s => s.zeroDayStats);
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

    const counterState = { ...displayStats, threat: 0 };
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

  return (
    <AnimatePresence>
      <Motion.div
        className="zero-day-complete-overlay"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="complete-content">
          <div className="complete-header">
            <span className="header-status">ALL SYSTEMS COMPROMISED</span>
            <span className="header-title">SIEGE_COMPLETE</span>
          </div>

          <div className="complete-stats">
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

          <div className="complete-threat-level">
            <div className="threat-header">
              <span>CURRENT THREAT LEVEL</span>
              <span className="level">OMEGA</span>
            </div>
            <div className="zero-day-threat-bar">
              <span style={{ width: `${threatProgress * 100}%` }} />
            </div>
          </div>

          <div className="complete-actions">
            <button type="button" className="zero-day-action-button reset" onClick={handleResetSystem}>
              RESET SYSTEM
            </button>
            <button type="button" className="zero-day-action-button export" onClick={() => window.print()}>
              EXPORT CLASSIFIED REPORT
            </button>
          </div>
        </div>
      </Motion.div>
    </AnimatePresence>
  );
});

export default ZeroDayComplete;
