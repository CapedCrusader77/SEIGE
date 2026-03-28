/* Zero day UI: final compromise overlay with counted summary stats, report generation, and full session reset controls. */
import { useEffect, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import gsap from "gsap";

const DEFAULT_STATS = {
  nodes_compromised: 5,
  credentials_stolen: 847,
  firewall_rules_bypassed: 12,
  detection_evasions: 9,
};

export default function ZeroDayComplete({ visible, stats = DEFAULT_STATS, sessionTime, onGenerateReport, onResetSystem }) {
  const [displayStats, setDisplayStats] = useState({
    nodes_compromised: 0,
    credentials_stolen: 0,
    firewall_rules_bypassed: 0,
    detection_evasions: 0,
  });
  const [threatProgress, setThreatProgress] = useState(0);
  const countersRef = useRef(null);

  useEffect(() => {
    if (!visible) return undefined;

    const counterState = { ...displayStats, threat: 0 };
    const timeline = gsap.timeline();

    // Use a helper to update the state from GSAP
    const updateStats = () => {
      setDisplayStats({
        nodes_compromised: Math.round(counterState.nodes_compromised),
        credentials_stolen: Math.round(counterState.credentials_stolen),
        firewall_rules_bypassed: Math.round(counterState.firewall_rules_bypassed),
        detection_evasions: Math.round(counterState.detection_evasions),
      });
    };

    // Stagger the counters: count up one-by-one
    timeline
      .to(counterState, { nodes_compromised: stats.nodes_compromised, duration: 0.6, ease: "power2.out", onUpdate: updateStats })
      .to(counterState, { credentials_stolen: stats.credentials_stolen, duration: 0.8, ease: "power2.out", onUpdate: updateStats }, "+=0.1")
      .to(counterState, { firewall_rules_bypassed: stats.firewall_rules_bypassed, duration: 0.6, ease: "power2.out", onUpdate: updateStats }, "+=0.1")
      .to(counterState, { detection_evasions: stats.detection_evasions, duration: 0.6, ease: "power2.out", onUpdate: updateStats }, "+=0.1")
      .to(counterState, { threat: 1, duration: 1.2, ease: "power2.inOut", onUpdate: () => setThreatProgress(counterState.threat) }, "-=0.2");

    return () => {
      timeline.kill();
    };

  }, [displayStats, stats, visible]);

  if (!visible) return null;

  return (
    <Motion.div
      className="zero-day-complete"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div ref={countersRef} className="zero-day-complete-card">
        <div className="zero-day-complete-header">
          <h2>TOTAL SYSTEM COMPROMISE</h2>
          <div className="zero-day-complete-divider" />
          <div className="zero-day-complete-cve">CVE-2024-SIEGE SUCCESSFULLY EXECUTED</div>
        </div>

        <div className="zero-day-stats-table">
          <div>NODES COMPROMISED............... {displayStats.nodes_compromised} / 5</div>
          <div>CREDENTIALS EXFILTRATED......... {displayStats.credentials_stolen}</div>
          <div>FIREWALL RULES BYPASSED......... {displayStats.firewall_rules_bypassed}</div>
          <div>DETECTION EVASIONS.............. {displayStats.detection_evasions}</div>
          <div>TIME TO TOTAL COMPROMISE........ {sessionTime}</div>
        </div>

        <div className="zero-day-threat-wrap">
          <div className="zero-day-threat-bar">
            <span style={{ width: `${threatProgress * 100}%` }} />
          </div>
          <strong>THREAT LEVEL: OMEGA</strong>
        </div>

        <div className="zero-day-actions">
          <button type="button" className="zero-day-action-button report" onClick={onGenerateReport}>
            GENERATE REPORT
          </button>
          <button type="button" className="zero-day-action-button reset" onClick={onResetSystem}>
            RESET SYSTEM
          </button>
        </div>
      </div>
    </Motion.div>
  );
}
