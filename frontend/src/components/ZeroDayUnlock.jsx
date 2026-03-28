/* Zero day UI: bottom classified banner with a 3-second hold-to-authorize control that unlocks the cinematic execution sequence. */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import gsap from "gsap";

const HOLD_DURATION_MS = 3000;

export default function ZeroDayUnlock({ visible, phase, onAuthorize }) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef(0);
  const frameRef = useRef(0);
  const buttonRef = useRef(null);

  const buttonLabel = useMemo(() => {
    if (phase === "authorized" || phase === "executing" || phase === "complete") return "AUTHORIZED";
    if (isHolding) return "AUTHORIZING...";
    return "HOLD TO AUTHORIZE ZERO DAY";
  }, [isHolding, phase]);

  const stopHoldLoop = () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  };

  const resetHold = (withShake = false) => {
    stopHoldLoop();
    setIsHolding(false);
    setHoldProgress(0);
    if (withShake && buttonRef.current) {
      gsap.fromTo(buttonRef.current, { x: 0 }, { x: 0, keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 4 }, { x: 0 }], duration: 0.35, ease: "power2.out" });
    }
  };

  useEffect(() => () => stopHoldLoop(), []);

  if (!visible) return null;

  const beginHold = () => {
    if (phase) return;
    holdStartRef.current = performance.now();
    setIsHolding(true);

    const tick = (now) => {
      const progress = Math.min(1, (now - holdStartRef.current) / HOLD_DURATION_MS);
      setHoldProgress(progress);
      if (progress >= 1) {
        stopHoldLoop();
        setIsHolding(false);
        onAuthorize?.();
        return;
      }
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (!isHolding) return;
    resetHold(true);
  };

  return (
    <Motion.aside
      className="zero-day-unlock"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="zero-day-unlock-grid">
        <div className="zero-day-unlock-heading">
          <span className="warning-blink">⚠</span>
          <strong>CLASSIFIED PAYLOAD UNLOCKED</strong>
          <span className="warning-blink">⚠</span>
        </div>
        <div className="zero-day-unlock-divider" />
        <p>Network integrity critically compromised.</p>
        <p className="zero-day-cve">CVE-2024-SIEGE: Unknown vulnerability detected.</p>
        <p>This exploit bypasses all firewall rules.</p>
        <button
          ref={buttonRef}
          type="button"
          className="zero-day-hold-button"
          onMouseDown={beginHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={beginHold}
          onTouchEnd={cancelHold}
          disabled={phase === "authorized" || phase === "executing" || phase === "complete"}
        >
          <span className="zero-day-hold-fill" style={{ transform: `scaleX(${holdProgress})` }} />
          <span className="zero-day-hold-label">{buttonLabel}</span>
        </button>
      </div>
    </Motion.aside>
  );
}
