import { memo } from "react";
import { motion as Motion } from "framer-motion";
import useSiegeStore from "../store/siegeStore";
import useAttackHandlers from "../hooks/useAttackHandlers";

const ATTACK_STYLES = {
  "port-scan": {
    label: "Port Reconnaissance",
    tone: "green",
    icon: (
      <svg className="attack-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="attack-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="attack-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="attack-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
      </svg>
    ),
    summary: "Overwhelm the edge with sustained traffic surges.",
  },
};

const AttackButton = memo(function AttackButton() {
  const isScanning = useSiegeStore(s => s.isScanning);
  const attackChainActive = useSiegeStore(s => s.attackChainActive);
  const lastAttackEvent = useSiegeStore(s => s.lastAttackEvent);
  const { handleLaunchAttack, handleLaunchAttackChain } = useAttackHandlers();

  const attackDefinitions = Object.entries(ATTACK_STYLES).map(([id, config]) => ({ id, ...config }));

  return (
    <div className="control-stack">
      <div className="panel-header compact">
        <div>
          <span className="eyebrow">PRIMARY ENGAGEMENT VECTOR</span>
          <h3>ATTACK PROTOCOLS</h3>
        </div>
        <div className="header-status">
          <span className="live-pill">
            <span className="live-dot" style={{ animation: (isScanning || attackChainActive) ? "livePulse 1s infinite" : "none", backgroundColor: (isScanning || attackChainActive) ? "var(--red)" : "var(--green)" }} /> 
            {isScanning || attackChainActive ? "ACTIVE" : "READY"}
          </span>
        </div>
      </div>

      <div className="attack-button-stack">
        {attackDefinitions.map((attack, index) => {
          const isFiring = lastAttackEvent?.type === attack.id && (Date.now() - lastAttackEvent.timestamp < 3000) && (isScanning || attackChainActive);
          return (
            <button
              key={attack.id}
              className={`attack-button tone-${attack.tone} ${isFiring ? "is-firing" : ""}`}
              onClick={() => handleLaunchAttack(attack.id)}
              disabled={isScanning || attackChainActive}
            >
              <div className="attack-card-border" />
              <div className="attack-icon-box">
                <span className="attack-icon-mark">0{index + 1}</span>
                {attack.icon}
              </div>
              <div className="attack-copy">
                <strong>{attack.label}</strong>
                <small>{attack.summary}</small>
              </div>
              <div className="attack-card-side">
                <div className={`attack-status-badge ${isScanning || attackChainActive ? (isFiring ? 'status-firing' : 'status-idle') : 'status-armed'}`}>
                  {isScanning || attackChainActive ? (isFiring ? "FIRING" : "LOCKED") : "ARMED"}
                </div>
                <div className="attack-fire-label">
                  INITIALIZE <span className="attack-button-arrow">→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="chain-action-sector">
        <button
          className="attack-chain-button"
          onClick={handleLaunchAttackChain}
          disabled={isScanning || attackChainActive}
        >
          <div className="chain-button-inner">
            <div className="chain-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="chain-text">
              <strong>APT-ADVANCED PERSISTENT THREAT</strong>
              <span className="chain-subtitle">EXECUTE FULL MULTI-VECTOR ATTACK CHAIN</span>
            </div>
            {attackChainActive && <div className="chain-pulse" />}
          </div>
        </button>
      </div>
    </div>
  );
});

export default AttackButton;
