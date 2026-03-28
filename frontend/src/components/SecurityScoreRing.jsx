import { memo, useEffect, useState } from "react";
import { animate, motion as Motion, useMotionValue } from "framer-motion";
import useSiegeStore from "../store/siegeStore";

const SecurityScoreRing = memo(function SecurityScoreRing() {
  const securityScore = useSiegeStore(s => s.securityScore);
  const motionValue = useMotionValue(100);
  const [displayScore, setDisplayScore] = useState(100);

  useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => {
      setDisplayScore(Math.round(latest));
    });
    const controls = animate(motionValue, securityScore, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => { unsubscribe(); controls.stop(); };
  }, [motionValue, securityScore]);

  const getScoreStatus = (score) => {
    if (score > 75) return "CRYPTO_SECURE";
    if (score > 45) return "PERIMETER_PROBED";
    if (score > 20) return "NETWORK_CRITICAL";
    return "SYSTEM_COMPROMISED";
  };

  const getScoreColor = (score) => {
    if (score > 75) return "var(--green)";
    if (score > 45) return "var(--amber)";
    return "var(--red)";
  };

  return (
    <div className="security-score-card">
      <div className="card-header">
        <span className="status-label">GLOBAL SECURITY POSTURE</span>
        <span className="status-meta">v3.9 // LIVE</span>
      </div>

      <div className="score-main">
        <div className="score-ring-container">
          <svg className="score-ring-svg" viewBox="0 0 100 100">
            <circle className="ring-bg" cx="50" cy="50" r="44" />
            <Motion.circle
              className="ring-progress"
              cx="50"
              cy="50"
              r="44"
              initial={{ pathLength: 1 }}
              animate={{ pathLength: displayScore / 100 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ stroke: getScoreColor(displayScore) }}
            />
          </svg>
          <div className="score-value-container">
            <span className="score-value">{displayScore}</span>
            <span className="score-percent">%</span>
          </div>
        </div>

        <div className="score-details">
          <div className="detail-status" style={{ color: getScoreColor(displayScore) }}>
            {getScoreStatus(displayScore)}
          </div>
          <p className="detail-summary">
            Real-time aggregate metric of network integrity, firewall effectiveness, and node stability.
          </p>
          <div className="detail-meta">
            <span>UPTIME: 14:02:11</span>
            <span>LATENCY: 12ms</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SecurityScoreRing;
