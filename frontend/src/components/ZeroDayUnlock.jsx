import { memo, useState, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useZeroDay from "../hooks/useZeroDay";

const ZeroDayUnlock = memo(function ZeroDayUnlock() {
  const {
    zeroDayUnlocked,
    zeroDayPhase,
    handleAuthorize,
    overlayRef,
    lineRef,
    topTextRef,
    bottomTextRef,
    disabledRef,
  } = useZeroDay();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(holdTimerRef.current);
  }, []);

  const stopHolding = () => {
    clearInterval(holdTimerRef.current);
    holdTimerRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  };

  const startHolding = () => {
    if (holdTimerRef.current) {
      return;
    }

    setIsHolding(true);
    const startTime = Date.now();
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 3000, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setIsHolding(false);
        setHoldProgress(0);
        handleAuthorize();
      }
    }, 50);
  };

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
              onPointerDown={startHolding}
              onPointerUp={stopHolding}
              onPointerLeave={stopHolding}
              onPointerCancel={stopHolding}
            >
              <div className="btn-background" style={{ transform: `scaleX(${holdProgress})` }} />
              <span className="btn-label">{isHolding ? "AUTHORIZING..." : "HOLD TO AUTHORIZE"}</span>
            </button>
          </div>
        </Motion.div>
      )}

      {zeroDayPhase === "executing" && (
        <div className="zero-day-overlay-dim" ref={overlayRef}>
          <div className="zero-day-content">
            <div className="zero-day-line" ref={lineRef} />
            <div className="zero-day-text-top" ref={topTextRef} />
            <div className="zero-day-text-bottom" ref={bottomTextRef} />
            <div className="zero-day-disabled-status" ref={disabledRef}>
              FIREWALL DISABLED
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
});

export default ZeroDayUnlock;
