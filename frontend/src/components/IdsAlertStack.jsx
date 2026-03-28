import { AnimatePresence, motion as Motion } from "framer-motion";

export default function IdsAlertStack({ alerts, onDismiss }) {
  return (
    <div className="ids-stack">
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <Motion.button
            key={alert.id}
            type="button"
            className="ids-alert"
            onClick={() => onDismiss(alert.id)}
            initial={{ opacity: 0, x: 120, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 160 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            whileHover={{ x: 8 }}
            drag="x"
            dragConstraints={{ left: 0, right: 220 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x > 90) onDismiss(alert.id);
            }}
          >
            <div className="ids-alert-kicker">IDS ALERT</div>
            <strong>{alert.threat}</strong>
            <span>Severity: {alert.severity}</span>
          </Motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
