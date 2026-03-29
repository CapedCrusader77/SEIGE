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

  const circumference = 2 * Math.PI * 40; // r=40
  const dashOffset = circumference - (circumference * displayScore) / 100;

  return (
    <div className={`score-ring-shell ${displayScore <= 20 ? 'danger' : ''}`}>
      <svg className="score-ring-svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="ring-gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#41ff9b" />
            <stop offset="100%" stopColor="#128a4b" />
          </linearGradient>
          <linearGradient id="ring-gradient-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb141" />
            <stop offset="100%" stopColor="#9e6200" />
          </linearGradient>
          <linearGradient id="ring-gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff5b5b" />
            <stop offset="100%" stopColor="#870000" />
          </linearGradient>
        </defs>

        {/* Background dotted track */}
        <circle className="score-ring-track" cx="50" cy="50" r="40" strokeDasharray="3 4" />

        {/* Dynamic bright ring passing over */}
        <Motion.circle
          className="score-ring-progress"
          cx="50"
          cy="50"
          r="40"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          style={{ strokeDasharray: circumference }}
          stroke={
            displayScore > 75
              ? "url(#ring-gradient-green)"
              : displayScore > 45
              ? "url(#ring-gradient-amber)"
              : "url(#ring-gradient-red)"
          }
        />
        
        {/* Adaptive inner surface to blend with surrounding panel */}
        <circle className="score-ring-core" cx="50" cy="50" r="31" />
      </svg>
      <div className="score-ring-center">
        <span>{displayScore}</span>
        <small style={{ color: getScoreColor(displayScore) }}>{getScoreStatus(displayScore)}</small>
        <div className="score-ring-label">POSTURE ALIGNMENT</div>
      </div>
    </div>
  );
});

export default SecurityScoreRing;
