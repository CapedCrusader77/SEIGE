import { memo } from "react";
import { motion as Motion } from "framer-motion";
import useSiegeStore from "../store/siegeStore";
import useAttackHandlers from "../hooks/useAttackHandlers";

const ATTACK_STYLES = {
  "port-scan": {
    label: "Port Reconnaissance",
    tone: "green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" strokeDasharray="4 4" />
        <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
        <path d="M12 12l4 4" strokeLinecap="round" />
      </svg>
    ),
    summary: "Enumerate exposed ports and map the perimeter.",
  },
  "brute-force": {
    label: "Brute Force Auth",
    tone: "amber",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="7" y="11" width="10" height="8" rx="2" />
        <path d="M9 11V7a3 3 0 016 0v4" />
        <circle cx="12" cy="15" r="1" />
      </svg>
    ),
    summary: "Hammer credential surfaces with a rotating key cycle.",
  },
  "sql-injection": {
    label: "SQL Micro Injection",
    tone: "violet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </svg>
    ),
    summary: "Inject payload chains and probe data exfil routes.",
  },
  ddos: {
    label: "DDoS Flood Wave",
    tone: "red",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
      </svg>
    ),
    summary: "Overwhelm the edge with sustained traffic surges.",
  },
};

const AttackButton = memo(function AttackButton() {
  const isScanning = useSiegeStore(s => s.isScanning);
  const attackChainActive = useSiegeStore(s => s.attackChainActive);
  const { handleLaunchAttack, handleLaunchAttackChain } = useAttackHandlers();

  const attackDefinitions = Object.entries(ATTACK_STYLES).map(([id, config]) => ({ id, ...config }));

  return (
    <div className="attack-control-panel">
      <div className="panel-header">
        <div className="header-label">
          <span className="label-dot" />
          PRIMARY ENGAGEMENT VECTOR
        </div>
        <div className="header-status">{isScanning || attackChainActive ? "ACTIVE" : "READY"}</div>
      </div>

      <div className="attack-grid">
        {attackDefinitions.map((attack) => (
          <Motion.button
            key={attack.id}
            className={`attack-card ${attack.tone} ${isScanning || attackChainActive ? "disabled" : ""}`}
            whileHover={!isScanning && !attackChainActive ? { y: -4, scale: 1.02 } : {}}
            whileTap={!isScanning && !attackChainActive ? { scale: 0.98 } : {}}
            onClick={() => handleLaunchAttack(attack.id)}
            disabled={isScanning || attackChainActive}
          >
            <div className="card-top">
              <div className="card-icon">{attack.icon}</div>
              <div className="card-type">{attack.id.replace("-", " ").toUpperCase()}</div>
            </div>
            <div className="card-body">
              <div className="card-label">{attack.label}</div>
              <p className="card-summary">{attack.summary}</p>
            </div>
            <div className="card-footer">
              <span className="footer-action">INITIALIZE SEQUENCE</span>
              <span className="footer-arrow">→</span>
            </div>
          </Motion.button>
        ))}
      </div>

      <div className="chain-action-sector">
        <button
          className={`chain-launch-button ${isScanning || attackChainActive ? "disabled" : ""}`}
          onClick={handleLaunchAttackChain}
          disabled={isScanning || attackChainActive}
        >
          <div className="chain-info">
            <span className="chain-label">APT-ADVANCED PERSISTENT THREAT</span>
            <span className="chain-sub">EXECUTE FULL MULTI-VECTOR ATTACK CHAIN</span>
          </div>
          <div className="chain-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
});

export default AttackButton;
