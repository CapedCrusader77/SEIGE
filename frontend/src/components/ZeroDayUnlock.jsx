import { memo, useState, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useZeroDay from "../hooks/useZeroDay";

const ZeroDayUnlock = memo(function ZeroDayUnlock() {
  const { zeroDayUnlocked, zeroDayPhase, handleAuthorize, refs } = useZeroDay();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef(null);

  useEffect(() => {
    if (isHolding) {
      const startTime = Date.now();
      holdTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 3000, 1);
        setHoldProgress(progress);
        if (progress >= 1) {
          clearInterval(holdTimerRef.current);
          handleAuthorize();
        }
      }, 50);
    } else {
      clearInterval(holdTimerRef.current);
      setHoldProgress(0);
    }
    return () => clearInterval(holdTimerRef.current);
  }, [isHolding, handleAuthorize]);

  if (!zeroDayUnlocked && zeroDayPhase === null) return null;

  return (
    <AnimatePresence>
      {zeroDayPhase === null && (
        <Motion.div
          className="zero-day-unlock"
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
        >
          <div className="unlock-header">
            <span className="unlock-warning">CLASSIFIED VULNERABILITY DETECTED</span>
            <span className="unlock-id">CVE-2024-SIEGE</span>
          </div>

          <div className="unlock-body">
            <p>CRITICAL EXPLOITS CONFIRMED. SYSTEM OVERRIDE AUTHORIZATION REQUIRED.</p>

            <button
              className={`authorize-btn ${isHolding ? "holding" : ""}`}
              onPointerDown={() => setIsHolding(true)}
              onPointerUp={() => setIsHolding(false)}
              onPointerLeave={() => setIsHolding(false)}
              onPointerCancel={() => setIsHolding(false)}
            >
              <div className="btn-background" style={{ transform: `scaleX(${holdProgress})` }} />
              <span className="btn-label">{isHolding ? "AUTHORIZING..." : "HOLD TO AUTHORIZE"}</span>
            </button>
          </div>
        </Motion.div>
      )}

      {zeroDayPhase === "executing" && (
        <div className="zero-day-overlay-dim" ref={refs.overlay}>
          <div className="zero-day-content">
            <div className="zero-day-line" ref={refs.line} />
            <div className="zero-day-text-top" ref={refs.topText} />
            <div className="zero-day-text-bottom" ref={refs.bottomText} />
            <div className="zero-day-disabled-status" ref={refs.disabled}>
              FIREWALL DISABLED
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
});

export default ZeroDayUnlock;
