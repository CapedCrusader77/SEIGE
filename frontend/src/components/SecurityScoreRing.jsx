import { useEffect } from "react";
import { animate, motion as Motion, useMotionValue, useTransform } from "framer-motion";

const RADIUS = 62;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const getTone = (value) => {
  if (value >= 80) return "#41ff9b";
  if (value >= 50) return "#ffb141";
  return "#ff5b5b";
};

export default function SecurityScoreRing({ value }) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const progress = useTransform(motionValue, (latest) => CIRCUMFERENCE - (latest / 100) * CIRCUMFERENCE);
  const ringColor = getTone(value);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [motionValue, value]);

  return (
    <Motion.div
      className={`score-ring-shell ${value < 50 ? "danger" : value < 80 ? "warning" : "healthy"}`}
      animate={value < 50 ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <svg viewBox="0 0 180 180" className="score-ring-svg">
        <circle cx="90" cy="90" r={RADIUS} className="score-ring-track" />
        <Motion.circle
          cx="90"
          cy="90"
          r={RADIUS}
          className="score-ring-progress"
          style={{
            stroke: ringColor,
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: progress,
          }}
        />
      </svg>

      <div className="score-ring-center">
        <Motion.span style={{ color: ringColor }}>{rounded}</Motion.span>
        <small>system integrity</small>
      </div>
    </Motion.div>
  );
}
