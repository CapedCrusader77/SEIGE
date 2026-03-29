import { useEffect, useState } from "react";
import { AnimatePresence, animate, useMotionValue } from "framer-motion";
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
import DefenseControls from "./components/DefenseControls";
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

  return (
    <section id="dashboard" className={`dashboard-section ${zeroDayActive ? "zero-day-dashboard-tint" : ""}`}>
      <div className="dashboard-header-shell">
        <header className="war-room-header panel-frame">
          <div className="war-room-topline">
            <div className="war-room-brand">
              <span className="war-room-title">GLOBAL SECURITY POSTURE</span>
              <div className="war-room-divider-bar" />
              <span className="war-room-session-label">v3.9 // LIVE</span>
            </div>
            <div className="war-room-timer">RUNTIME: {sessionTime}</div>
          </div>
          <div className="war-room-progress-line"><span /></div>
          <div className="war-room-stats">
            <WarRoomStat label="ATTACK VECTORS" value={attacksCount} pad={2} />
            <WarRoomStat label="SUCCESSFUL BREACHES" value={successCount} pad={2} />
            <WarRoomStat label="DEFENSES TRIGGERED" value={blockedCount} pad={2} />
            <WarRoomStat label="PACKETS INTERCEPTED" value={packetsIntercepted} />
            <WarRoomStat label="CRITICAL THREATS" value={0} />
          </div>
        </header>
        <div className="dashboard-defense-row">
          <DefenseControls />
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel-frame map-stage">
          <div className="hex-grid-overlay" />
          <NetworkMap />
        </div>

        <div className="sidebar-frame panel-frame">
          <SecurityScoreRing />
          <AttackButton />
        </div>
      </div>

      <div className="audit-log-center">
        <TerminalPanel />
      </div>

      <AnalyticsPanel sessionTime={sessionTime} packetsIntercepted={packetsIntercepted} />
      <IdsAlertStack />
      <ZeroDayUnlock />
      <ZeroDayComplete />

      {isExporting && (
        <div className="export-overlay">
          <div className="loader-ring" />
          <span>GENERATING COMPLIANCE REPORT...</span>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const showLoader = useSiegeStore(s => s.showLoader);
  const sessionStartTime = useSiegeStore(s => s.sessionStartTime);
  const isScanning = useSiegeStore(s => s.isScanning);
  
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

  const handleScrollToDashboard = () => {
    document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="siege-app">
      <CustomCursor />
      <div className="orbital-grid-backdrop" />
      <div className="orbital-atmosphere orbital-atmosphere-left" />
      <div className="orbital-atmosphere orbital-atmosphere-right" />
      <div className="global-scanlines" />
      <div className="siege-vignette" />
      <AnimatePresence>
        {showLoader && <LoadingScreen />}
      </AnimatePresence>
      <HeroSection onScrollDown={handleScrollToDashboard} isScanning={isScanning} />
      <DashboardSection sessionTime={sessionTime} packetsIntercepted={packetsIntercepted} />
    </div>
  );
}
