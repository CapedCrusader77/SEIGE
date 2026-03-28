import { memo } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import useSiegeStore from "../store/siegeStore";

const IdsAlertStack = memo(function IdsAlertStack() {
  const idsAlerts = useSiegeStore(s => s.idsAlerts);
  const removeIdsAlert = useSiegeStore(s => s.removeIdsAlert);

  return (
    <div className="ids-alert-stack">
      <AnimatePresence>
        {idsAlerts.map((alert) => (
          <Motion.div
            key={alert.id}
            className={`ids-alert-item ${alert.severity === "CRITICAL" ? "critical" : "warning"}`}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
            layout
          >
            <div className="alert-header">
              <span className="alert-tag">IDS_INTRUSION_ALERT</span>
              <button className="alert-close" onClick={() => removeIdsAlert(alert.id)}>
                &times;
              </button>
            </div>
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
