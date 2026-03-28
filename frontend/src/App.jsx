import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, animate, motion as Motion, useMotionValue } from "framer-motion";
import Lenis from "lenis";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";

// Components
import LoadingScreen from "./components/LoadingScreen";
import HeroSection from "./components/HeroSection";
import CustomCursor from "./components/CustomCursor";
import NetworkMap from "./components/NetworkMap";
import AttackButton from "./components/AttackButton";
import SecurityScoreRing from "./components/SecurityScoreRing";
import TerminalPanel from "./components/TerminalPanel";
import IdsAlertStack from "./components/IdsAlertStack";
import AnalyticsPanel from "./components/AnalyticsPanel";
import ZeroDayUnlock from "./components/ZeroDayUnlock";
import ZeroDayComplete from "./components/ZeroDayComplete";

// Store & Hooks
import useSiegeStore from "./store/siegeStore";
import useWebSocket from "./hooks/useWebSocket";
import useSessionTimer from "./hooks/useSessionTimer";
import usePacketCounter from "./hooks/usePacketCounter";
import useAttackHandlers from "./hooks/useAttackHandlers";

gsap.registerPlugin(TextPlugin);

function WarRoomStat({ label, value, suffix = "", pad = 0 }) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(pad ? String(0).padStart(pad, "0") : "0");

  useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => {
      const rounded = Math.round(latest);
      setDisplayValue(pad ? String(rounded).padStart(pad, "0") : String(rounded));
    });
    const controls = animate(motionValue, value, { duration: 1, ease: [0.22, 1, 0.36, 1] });
    return () => { unsubscribe(); controls.stop(); };
  }, [motionValue, pad, value]);

  return (
    <div className="war-room-stat">
      <span>{label}</span>
      <strong>{displayValue}{suffix}</strong>
    </div>
  );
}

function DashboardSection({ sessionTime, packetsIntercepted }) {
  const attacksCount = useSiegeStore(s => s.attacksCount);
  const successCount = useSiegeStore(s => s.successCount);
  const blockedCount = useSiegeStore(s => s.blockedCount);
  const isExporting = useSiegeStore(s => s.isExporting);
  const zeroDayActive = useSiegeStore(s => s.zeroDayActive);
  const zeroDayPhase = useSiegeStore(s => s.zeroDayPhase);

  const topMetrics = useMemo(() => [
    { label: "Attack Sequences", value: attacksCount },
    { label: "Successful Breaches", value: successCount },
    { label: "Defenses Triggered", value: blockedCount },
  ], [attacksCount, successCount, blockedCount]);

  return (
    <div className={`siege-dashboard ${zeroDayActive ? "zero-day-tint" : ""}`}>
      <header className="siege-header">
        <div className="header-left">
          <div className="siege-logo">SIEGE<span>v0.4.2</span></div>
          <div className="header-stats">
            {topMetrics.map((m, i) => <WarRoomStat key={i} label={m.label} value={m.value} pad={2} />)}
          </div>
        </div>
        <div className="header-right">
          <WarRoomStat label="Session Clock" value={0} suffix={sessionTime} />
          <WarRoomStat label="Packets Captured" value={packetsIntercepted} />
        </div>
      </header>

      <main className="siege-grid">
        <div className="grid-left">
          <NetworkMap />
        </div>
        <div className="grid-right">
          <div className="score-terminal-container">
            <SecurityScoreRing />
            <TerminalPanel />
          </div>
          <AttackButton />
        </div>
      </main>

      <AnalyticsPanel />
      <IdsAlertStack />
      <ZeroDayUnlock />
      <ZeroDayComplete />

      {isExporting && (
        <div className="export-overlay">
          <div className="loader-ring" />
          <span>GENERATING COMPLIANCE REPORT...</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const showLoader = useSiegeStore(s => s.showLoader);
  const sessionStartTime = useSiegeStore(s => s.sessionStartTime);
  
  // Initialize Global Hooks
  useWebSocket();
  const { sessionTime } = useSessionTimer(sessionStartTime);
  const { packetsIntercepted } = usePacketCounter();

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="siege-app">
      <CustomCursor />
      <div className="global-scanlines" />
      <div className="siege-vignette" />
      <AnimatePresence>
        {showLoader && <LoadingScreen />}
      </AnimatePresence>
      <HeroSection />
      <DashboardSection sessionTime={sessionTime} packetsIntercepted={packetsIntercepted} />
    </div>
  );
}
