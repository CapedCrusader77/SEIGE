/* UI tweak: kept the command-card layout but removed the explicit fire callout so the buttons feel cleaner. */
import { motion as Motion } from "framer-motion";
import { useState } from "react";

function AttackGlyph({ icon }) {
  if (icon === "scan") {
    return (
      <svg viewBox="0 0 32 32" className="attack-icon-svg">
        <rect x="7" y="8" width="18" height="14" rx="3" />
        <path d="M10 13h12M9 18h14M16 8v14" />
      </svg>
    );
  }

  if (icon === "key") {
    return (
      <svg viewBox="0 0 32 32" className="attack-icon-svg">
        <circle cx="11" cy="16" r="5" />
        <path d="M16 16h10M22 16v-3M25 16v3" />
      </svg>
    );
  }

  if (icon === "database") {
    return (
      <svg viewBox="0 0 32 32" className="attack-icon-svg">
        <ellipse cx="16" cy="9" rx="8" ry="3.5" />
        <path d="M8 9v11c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5V9" />
        <path d="M8 14c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className="attack-icon-svg">
      <path d="M16 5v8M16 19v8M5 16h8M19 16h8M9 9l5 5M18 18l5 5M23 9l-5 5M14 18l-5 5" />
    </svg>
  );
}

export default function AttackButton({ attack, index, disabled, onClick }) {
  const [status, setStatus] = useState("armed");

  const handleClick = () => {
    if (disabled) return;
    setStatus("firing");
    onClick?.();

    window.setTimeout(() => {
      setStatus("armed");
    }, 700);
  };

  const effectiveStatus = disabled ? "idle" : status;
  const statusLabel = disabled ? "LOCKED" : effectiveStatus === "firing" ? "FIRING" : "ARMED";

  return (
    <Motion.button
      type="button"
      className={`attack-button tone-${attack.tone} ${effectiveStatus === "firing" ? "is-firing" : ""}`}
      onClick={handleClick}
      disabled={disabled}
      initial={{ opacity: 0, x: 72 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ delay: index * 0.12, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.992 }}
    >
      <span className="attack-card-border" />
      <span className="attack-icon-box">
        <span className="attack-icon-mark">[◈]</span>
        <AttackGlyph icon={attack.icon} />
      </span>

      <span className="attack-copy">
        <strong>{attack.label.toUpperCase()}</strong>
        <small>{attack.summary}</small>
      </span>

      <span className="attack-card-side">
        <span className={`attack-status-badge status-${effectiveStatus.toLowerCase()}`}>{statusLabel}</span>
        <span className="attack-button-arrow">────────▶</span>
      </span>
    </Motion.button>
  );
}
