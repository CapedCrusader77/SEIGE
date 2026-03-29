import { memo } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import useSiegeStore from "../store/siegeStore";

const IdsAlertStack = memo(function IdsAlertStack() {
  const idsAlerts = useSiegeStore(s => s.idsAlerts);
  const removeIdsAlert = useSiegeStore(s => s.removeIdsAlert);

  return (
    <div className="ids-alert-stack orbital-alert-stack">
      <AnimatePresence>
        {idsAlerts.map((alert) => (
          <Motion.div
            key={alert.id}
            className={`ids-alert-item orbital-alert-card ${alert.severity === "CRITICAL" ? "critical" : "warning"}`}
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.97, transition: { duration: 0.18 } }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            layout
          >
            <div className="alert-header">
              <span className="alert-tag">IDS INTRUSION ALERT</span>
              <button className="alert-close" onClick={() => removeIdsAlert(alert.id)}>
                &times;
              </button>
            </div>
            <div className="alert-orbital-rail" />
            <div className="alert-threat">{alert.threat}</div>
            <div className="alert-meta">
              <span>SOURCE: {alert.source || "EXTERNAL"}</span>
              <span className="alert-severity">{alert.severity}</span>
            </div>
            <div className="alert-progress-bar" />
          </Motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

export default IdsAlertStack;
