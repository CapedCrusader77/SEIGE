/* UI overhaul: reworked the shell into a war-room layout with a cinematic loader, centered hero, animated command header, and redesigned terminal/button surfaces while preserving simulation logic. */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, animate, motion as Motion, useMotionValue } from "framer-motion";
import Lenis from "lenis";
import NetworkMap from "./components/NetworkMap";
import LoadingScreen from "./components/LoadingScreen";
import HeroSection from "./components/HeroSection";
import AttackButton from "./components/AttackButton";
import SecurityScoreRing from "./components/SecurityScoreRing";
import TerminalPanel from "./components/TerminalPanel";
import IdsAlertStack from "./components/IdsAlertStack";
import CustomCursor from "./components/CustomCursor";
import AnalyticsPanel from "./components/AnalyticsPanel";
import { API_BASE_URL, CONTROL_API_HEADERS, WS_URL } from "./config";
import { generateSessionReport } from "./utils/reportGenerator";

const NODE_LABELS = {
  router: "Router",
  firewall: "Firewall",
  webserver: "Web Server",
  database: "Database",
  admin: "Admin Panel",
};

const ATTACK_STYLES = {
  "port-scan": {
    label: "Port Reconnaissance",
    tone: "green",
    icon: "scan",
    flash: "rgba(60, 255, 163, 0.4)",
    summary: "Enumerate exposed ports and map the perimeter.",
  },
  "brute-force": {
    label: "Brute Force Auth",
    tone: "amber",
    icon: "key",
    flash: "rgba(255, 166, 43, 0.42)",
    summary: "Hammer credential surfaces with a rotating key cycle.",
  },
  "sql-injection": {
    label: "SQL Micro Injection",
    tone: "violet",
    icon: "database",
    flash: "rgba(185, 96, 255, 0.42)",
    summary: "Inject payload chains and probe data exfil routes.",
  },
  ddos: {
    label: "DDoS Flood Wave",
    tone: "red",
    icon: "burst",
    flash: "rgba(255, 87, 87, 0.4)",
    summary: "Overwhelm the edge with sustained traffic surges.",
  },
};

const PANEL_TRANSITION = { ease: [0.22, 1, 0.36, 1], duration: 0.9 };

const formatSessionClock = (elapsedMs) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

function WarRoomStat({ label, value, suffix = "", pad = 0 }) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(pad ? String(0).padStart(pad, "0") : "0");

  useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => {
      const rounded = Math.round(latest);
      setDisplayValue(pad ? String(rounded).padStart(pad, "0") : String(rounded));
    });

    const controls = animate(motionValue, value, {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [motionValue, pad, value]);

  return (
    <div className="war-room-stat">
      <span>{label}</span>
      <strong>
        {displayValue}
        {suffix}
      </strong>
    </div>
  );
}

export default function App() {
  const [showLoader, setShowLoader] = useState(true);
  const [logs, setLogs] = useState([]);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [scanningNodeId, setScanningNodeId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [bruteForceTarget, setBruteForceTarget] = useState(null);
  const [crackedNodeId, setCrackedNodeId] = useState(null);
  const [sqlInjectionTarget, setSqlInjectionTarget] = useState(null);
  const [injectedNodeId, setInjectedNodeId] = useState(null);
  const [ddosTarget, setDdosTarget] = useState(null);
  const [ddosStatus, setDdosStatus] = useState(null);
  const [ddosRequestCount, setDdosRequestCount] = useState(0);
  const [crashedNodeId, setCrashedNodeId] = useState(null);
  const [firewallEnabled, setFirewallEnabled] = useState(false);
  const [idsEnabled, setIdsEnabled] = useState(false);
  const [idsAlerts, setIdsAlerts] = useState([]);
  const [securityScore, setSecurityScore] = useState(100);
  const [lastAttackEvent, setLastAttackEvent] = useState(null);
  const [attacksCount, setAttacksCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [compromisedNodeIds, setCompromisedNodeIds] = useState(() => new Set());
  const [isExporting, setIsExporting] = useState(false);
  // Setter intentionally retained to preserve the existing session state contract.
  const [sessionStartTime] = useState(Date.now());
  const [sessionTime, setSessionTime] = useState("00:00:00");
  const [packetsIntercepted, setPacketsIntercepted] = useState(0);
  const [lastPacketUpdate, setLastPacketUpdate] = useState(Date.now());
  const [nodeHitCounts, setNodeHitCounts] = useState({});
  const [securityScoreTimeline, setSecurityScoreTimeline] = useState([]);
  const [breachTimes, setBreachTimes] = useState([]);
  const [attackChainActive, setAttackChainActive] = useState(false);
  const [chainPhase, setChainPhase] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [edgeFlashColor, setEdgeFlashColor] = useState("");
  const [edgeFlashKey, setEdgeFlashKey] = useState(0);
  const [attackHistory, setAttackHistory] = useState([]);

  const dashboardRef = useRef(null);
  const activeAttackRef = useRef(null);
  const currentAttackMetricsRef = useRef({
    attack: null,
    successCounted: false,
    blockedCounted: false,
  });

  const topMetrics = useMemo(
    () => [
      { label: "Attack Sequences", value: attacksCount.toString().padStart(2, "0") },
      { label: "Successful Breaches", value: successCount.toString().padStart(2, "0") },
      { label: "Defenses Triggered", value: blockedCount.toString().padStart(2, "0") },
    ],
    [attacksCount, successCount, blockedCount],
  );

  const attackDefinitions = useMemo(
    () =>
      Object.entries(ATTACK_STYLES).map(([id, config]) => ({
        id,
        ...config,
      })),
    [],
  );

  const addLog = useCallback((tag, text, type) => {
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLogs((prev) => [...prev, { timestamp, tag, text, type }]);
  }, []);

  const addSessionEvent = useCallback((event) => {
    setSessionEvents((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        ...event,
      },
    ]);
  }, []);

  const markCompromisedNode = useCallback((nodeId) => {
    if (!nodeId) return;
    setCompromisedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowLoader(false), 4200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/history/events?limit=120`, {
          headers: CONTROL_API_HEADERS,
        });
        if (!response.ok) return;
        const data = await response.json();
        setHistoryEvents(Array.isArray(data.events) ? data.events : []);
      } catch {
        // History is additive UX; failures should not break core simulation.
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      setSessionTime(formatSessionClock(elapsed));
    }, 500);

    return () => clearInterval(timer);
  }, [sessionStartTime]);

  useEffect(() => {
    const packetTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastPacketUpdate > 600) {
        const newPackets = Math.floor(Math.random() * 4) + 1;
        setPacketsIntercepted((prev) => prev + newPackets);
        setLastPacketUpdate(now);
      }
    }, 600);

    return () => clearInterval(packetTimer);
  }, [lastPacketUpdate]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
    });

    let frameId = 0;
    const raf = (time) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    frameId = window.requestAnimationFrame(raf);
    return () => {
      window.cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      ws = new WebSocket(`${WS_URL}/ws`);

      ws.onopen = () => addLog("SYSTEM", "WebSocket connected", "success");

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setHistoryEvents((prev) => [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: new Date().toISOString(),
              type: data.type,
              attack: data.attack || null,
              nodeId: data.nodeId || data.targetId || null,
              severity: data.severity || null,
              payload: data,
            },
            ...prev,
          ].slice(0, 150));

          if (data.type === "ATTACK_START") {
            activeAttackRef.current = data.attack;
            currentAttackMetricsRef.current = { attack: data.attack, successCounted: false, blockedCounted: false };
            addLog("ATTACK", `Initiating ${data.attack} cluster sequence...`, "warning");
            addSessionEvent({
              attack: data.attack,
              phase: "ATTACK_START",
              targetId: null,
              targetLabel: null,
              outcome: "STARTED",
              details: `${data.attack} cluster sequence initiated`,
            });
            setAttacksCount((prev) => prev + 1);
            setIsScanning(true);
            setAttackHistory((prev) => [
              ...prev,
              { id: Date.now(), type: data.attack, timestamp: Date.now(), startTime: Date.now(), success: false },
            ]);
          }

          if (data.type === "NODE_SCAN_START") {
            setScanningNodeId(data.nodeId);
            addLog("SCAN", `Scanning node [${data.label}]...`, "info");
            addSessionEvent({ attack: "Port Scan", phase: "NODE_SCAN_START", targetId: data.nodeId, targetLabel: data.label, outcome: "SCANNING", details: `Port reconnaissance started on ${data.label}` });
            setLastAttackEvent({ type: "port-scan", targetId: data.nodeId, timestamp: Date.now() });
            setNodeHitCounts((prev) => ({ ...prev, [data.nodeId]: (prev[data.nodeId] || 0) + 1 }));
          }

          if (data.type === "SCAN_RESULT") {
            addLog("PORT", `  - ${data.port}/${data.status}`, data.status === "OPEN" ? "success" : "info");
            if (data.status === "OPEN") {
              addSessionEvent({ attack: "Port Scan", phase: "SCAN_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "OPEN_PORT", details: `Discovered open port ${data.port}` });
            }
          }

          if (data.type === "ATTACK_END") {
            setScanningNodeId(null);
            setIsScanning(false);
            setBruteForceTarget(null);
            setSqlInjectionTarget(null);
            setDdosTarget(null);
            setDdosStatus(null);
            activeAttackRef.current = null;
            addLog("SYSTEM", `${data.attack} cycle completed.`, "success");
            addSessionEvent({ attack: data.attack, phase: "ATTACK_END", targetId: null, targetLabel: null, outcome: "COMPLETED", details: `${data.attack} cycle completed` });
          }

          if (data.type === "DDOS_TARGET") {
            setDdosTarget(data.nodeId);
            setDdosRequestCount(100);
            addLog("DDOS", `Flooding node [${data.label}] with requests...`, "warning");
            addSessionEvent({ attack: "DDoS", phase: "DDOS_TARGET", targetId: data.nodeId, targetLabel: data.label, outcome: "TARGETED", details: `DDoS flood started against ${data.label}` });
            setNodeHitCounts((prev) => ({ ...prev, [data.nodeId]: (prev[data.nodeId] || 0) + 1 }));
          }

          if (data.type === "DDOS_WAVE") {
            setDdosStatus(data.status);
            setDdosRequestCount(data.count);
            addLog("TRAFFIC", `  [Wave ${data.wave}] Load: ${data.count.toLocaleString()} req/s`, data.status === "OVERLOADING" ? "danger" : "warning");
            addSessionEvent({ attack: "DDoS", phase: "DDOS_WAVE", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: data.status, details: `Wave ${data.wave} reached ${data.count.toLocaleString()} req/s` });
            setLastAttackEvent({ type: "ddos", targetId: "webserver", timestamp: Date.now() });
          }

          if (data.type === "DDOS_CRASH") {
            setCrashedNodeId(data.nodeId);
            setDdosStatus("CRASHED");
            setDdosTarget(null);
            addLog("CRITICAL", "Node is OFFLINE. Packet loss: 100%", "danger");
            addSessionEvent({ attack: "DDoS", phase: "DDOS_CRASH", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "CRASHED", details: "Service crash confirmed after sustained overload" });
            markCompromisedNode(data.nodeId);
            if (!currentAttackMetricsRef.current.successCounted) {
              currentAttackMetricsRef.current.successCounted = true;
              setSuccessCount((prev) => prev + 1);
            }
            setBreachTimes((prev) => [...prev, { attack: "DDoS", timestamp: Date.now(), nodeId: data.nodeId }]);
            setSecurityScore((prev) => {
              const newScore = Math.max(0, prev - 40);
              setSecurityScoreTimeline((timeline) => [...timeline, { timestamp: Date.now(), score: newScore, event: "DDoS Crash" }]);
              return newScore;
            });
            setAttackHistory((prev) => {
              const updated = [...prev];
              const lastAttack = updated[updated.length - 1];
              if (lastAttack && !lastAttack.success) {
                lastAttack.success = true;
                lastAttack.endTime = Date.now();
              }
              return updated;
            });
          }

          if (data.type === "BRUTE_TARGET") {
            setBruteForceTarget(data.nodeId);
            addLog("BRUTE", `Starting dictionary attack on [${data.label}]...`, "warning");
            addSessionEvent({ attack: "Brute Force", phase: "BRUTE_TARGET", targetId: data.nodeId, targetLabel: data.label, outcome: "TARGETED", details: `Credential attack started against ${data.label}` });
            setNodeHitCounts((prev) => ({ ...prev, [data.nodeId]: (prev[data.nodeId] || 0) + 1 }));
          }

          if (data.type === "BRUTE_RESULT") {
            if (data.result === "CRACKED") {
              setCrackedNodeId(data.nodeId);
              setBruteForceTarget(null);
              addLog("ACCESS", `SUCCESS! Credentials decrypted: ${data.password}`, "success");
              addSessionEvent({ attack: "Brute Force", phase: "BRUTE_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "CRACKED", details: `Valid credentials recovered: ${data.password}` });
              markCompromisedNode(data.nodeId);
              if (!currentAttackMetricsRef.current.successCounted) {
                currentAttackMetricsRef.current.successCounted = true;
                setSuccessCount((prev) => prev + 1);
              }
              setBreachTimes((prev) => [...prev, { attack: "Brute Force", timestamp: Date.now(), nodeId: data.nodeId }]);
              setSecurityScore((prev) => {
                const newScore = Math.max(0, prev - 25);
                setSecurityScoreTimeline((timeline) => [...timeline, { timestamp: Date.now(), score: newScore, event: "Brute Force Breach" }]);
                return newScore;
              });
              setAttackHistory((prev) => {
                const updated = [...prev];
                const lastAttack = updated[updated.length - 1];
                if (lastAttack && !lastAttack.success) {
                  lastAttack.success = true;
                  lastAttack.endTime = Date.now();
                }
                return updated;
              });
              setLastAttackEvent({ type: "brute-force", targetId: data.nodeId, timestamp: Date.now(), result: "CRACKED" });
            } else {
              addLog("FAIL", `  - Attempt [${data.password}] - Rejected`, "info");
              addSessionEvent({ attack: "Brute Force", phase: "BRUTE_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "FAILED", details: `Rejected credential candidate: ${data.password}` });
              setLastAttackEvent({ type: "brute-force", targetId: data.nodeId, timestamp: Date.now(), result: "FAILED" });
            }
          }

          if (data.type === "SQL_TARGET") {
            setSqlInjectionTarget(data.nodeId);
            addLog("SQL", `Injecting payload into [${data.label}]...`, "warning");
            addSessionEvent({ attack: "SQL Injection", phase: "SQL_TARGET", targetId: data.nodeId, targetLabel: data.label, outcome: "TARGETED", details: `Injection phase started against ${data.label}` });
            setNodeHitCounts((prev) => ({ ...prev, [data.nodeId]: (prev[data.nodeId] || 0) + 1 }));
          }

          if (data.type === "SQL_RESULT") {
            addLog("INJECT", `  - Payload: ${data.payload} -> ${data.result}`, data.result === "INJECTED" ? "sql" : "info");
            addSessionEvent({ attack: "SQL Injection", phase: "SQL_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: data.result, details: `Payload result: ${data.payload}` });

            if (data.result === "INJECTED") {
              setInjectedNodeId(data.nodeId);
              setSqlInjectionTarget(null);
              markCompromisedNode(data.nodeId);
              if (!currentAttackMetricsRef.current.successCounted) {
                currentAttackMetricsRef.current.successCounted = true;
                setSuccessCount((prev) => prev + 1);
              }
              setBreachTimes((prev) => [...prev, { attack: "SQL Injection", timestamp: Date.now(), nodeId: data.nodeId }]);
              setAttackHistory((prev) => {
                const updated = [...prev];
                const lastAttack = updated[updated.length - 1];
                if (lastAttack && !lastAttack.success) {
                  lastAttack.success = true;
                  lastAttack.endTime = Date.now();
                }
                return updated;
              });
            }

            setLastAttackEvent({ type: "sql-injection", targetId: data.nodeId, timestamp: Date.now(), result: data.result });
          }

          if (data.type === "DATA_EXFILTRATED") {
            addLog("EXFIL", "Data extraction started:", "success");
            data.data.forEach((record) => addLog("DATA", `  -> user:${record.user} | pass:${record.pass}`, "info"));
            addSessionEvent({ attack: "SQL Injection", phase: "DATA_EXFILTRATED", targetId: "database", targetLabel: "Database", outcome: "EXFILTRATED", details: `Extracted ${data.data.length} database records` });
            setSecurityScore((prev) => {
              const newScore = Math.max(0, prev - 30);
              setSecurityScoreTimeline((timeline) => [...timeline, { timestamp: Date.now(), score: newScore, event: "Data Exfiltration" }]);
              return newScore;
            });
          }

          if (data.type === "FIREWALL_STATUS") {
            setFirewallEnabled(data.enabled);
            addLog("DEFENSE", `Firewall state: ${data.enabled ? "ACTIVE" : "INACTIVE"}`, data.enabled ? "success" : "info");
          }

          if (data.type === "IDS_STATUS") {
            setIdsEnabled(data.enabled);
            addLog("DEFENSE", `IDS monitor: ${data.enabled ? "RUNNING" : "STOPPED"}`, data.enabled ? "success" : "info");
          }

          if (data.type === "IDS_ALERT") {
            const alertId = Date.now() + Math.random();
            setIdsAlerts((prev) => [{ id: alertId, ...data }, ...prev].slice(0, 3));
            window.setTimeout(() => setIdsAlerts((prev) => prev.filter((alert) => alert.id !== alertId)), 5000);
            addLog("ALERT", `[${data.severity}] ${data.threat}`, "danger");
          }

          if (data.type === "FIREWALL_BLOCK") {
            addLog("BLOCKED", `Shields up: ${data.message}`, "success");
            addSessionEvent({ attack: activeAttackRef.current || "Defense", phase: "FIREWALL_BLOCK", targetId: null, targetLabel: null, outcome: "BLOCKED", details: data.message });
            if (!currentAttackMetricsRef.current.blockedCounted) {
              currentAttackMetricsRef.current.blockedCounted = true;
              setBlockedCount((prev) => prev + 1);
            }
            setSecurityScore((prev) => {
              const newScore = Math.min(100, prev + 5);
              setSecurityScoreTimeline((timeline) => [...timeline, { timestamp: Date.now(), score: newScore, event: "Firewall Block" }]);
              return newScore;
            });
          }

          if (data.type === "ATTACK_CHAIN_START") {
            setAttackChainActive(true);
            addLog("CHAIN", "APT-STYLE ATTACK CHAIN INITIATED", "danger");
          }

          if (data.type === "CHAIN_PHASE") {
            setChainPhase({ phase: data.phase, total: data.total, attack: data.attack });
            addLog("CHAIN", `>>> ${data.message} <<<`, "warning");
          }

          if (data.type === "ATTACK_CHAIN_COMPLETE") {
            setAttackChainActive(false);
            setChainPhase(null);
            addLog("CHAIN", "ATTACK CHAIN COMPLETE - ALL PHASES EXECUTED", "success");
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = window.setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) window.clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [addLog, addSessionEvent, markCompromisedNode]);

  const triggerEdgeFlash = (attackType) => {
    const flash = ATTACK_STYLES[attackType]?.flash;
    if (!flash) return;
    setEdgeFlashColor(flash);
    setEdgeFlashKey((prev) => prev + 1);
  };

  const handleLaunchAttack = async (type) => {
    if (isScanning) return;
    if (type === "brute-force") setCrackedNodeId(null);
    if (type === "sql-injection") {
      setInjectedNodeId(null);
      setCrashedNodeId(null);
    }
    if (type === "ddos") setCrashedNodeId(null);

    triggerEdgeFlash(type);
    try {
      await fetch(`${API_BASE_URL}/attack/${type}`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      });
    } catch {
      addLog("ERROR", `Failed to connect to backend: ${type}`, "danger");
    }
  };

  const handleLaunchAttackChain = async () => {
    if (isScanning || attackChainActive) return;
    setCrackedNodeId(null);
    setInjectedNodeId(null);
    setCrashedNodeId(null);
    triggerEdgeFlash("ddos");

    try {
      await fetch(`${API_BASE_URL}/attack/chain`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      });
    } catch {
      addLog("ERROR", "Failed to initiate attack chain", "danger");
    }
  };

  const toggleDefense = async (type) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defense/${type}/toggle`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      });
      const data = await response.json();
      console.log(`Defense toggle ${type}:`, data);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (err) {
      console.error(`Defense toggle ${type} failed:`, err);
      addLog("ERROR", `Defense toggle failed: ${type}`, "danger");
    }
  };

  const handleExportReport = async () => {
    if (sessionEvents.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      generateSessionReport({
        attacksCount,
        successCount,
        blockedCount,
        compromisedNodeIds: Array.from(compromisedNodeIds),
        securityScore,
        sessionEvents,
        firewallEnabled,
        idsEnabled,
        historyEvents,
        securityScoreTimeline,
      });
      addLog("EXPORT", "Session PDF report generated.", "success");
    } catch (err) {
      console.error("Report export failed:", err);
      addLog("ERROR", "PDF export failed. Check console for details.", "danger");
    } finally {
      setIsExporting(false);
    }
  };

  const dismissAlert = (id) => setIdsAlerts((prev) => prev.filter((alert) => alert.id !== id));
  const scrollToDashboard = () => dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="siege-app">
      <div className="global-scanlines" />
      <div className="siege-vignette" />
      <CustomCursor />
      <AnimatePresence mode="wait">{showLoader ? <LoadingScreen key="loader" /> : null}</AnimatePresence>

      {!showLoader && (
        <>
          <AnimatePresence>
            {edgeFlashColor ? (
              <Motion.div
                key={edgeFlashKey}
                className="screen-edge-flash"
                style={{ "--flash-color": edgeFlashColor }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onAnimationComplete={() => setEdgeFlashColor("")}
              />
            ) : null}
          </AnimatePresence>

          <IdsAlertStack alerts={idsAlerts} onDismiss={dismissAlert} />

          <main className="siege-shell">
            <HeroSection onScrollDown={scrollToDashboard} isScanning={isScanning} />
            <section ref={dashboardRef} className="dashboard-section">
              <div className="dashboard-header-shell">
                <Motion.div className="war-room-header" initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={PANEL_TRANSITION}>
                  <div className="war-room-topline">
                    <div className="war-room-brand">
                      <span className="war-room-title siege-logo" data-text="SIEGE">
                        SIEGE
                      </span>
                      <span className="war-room-divider-bar" />
                      <span className="war-room-session-label">ACTIVE SESSION</span>
                    </div>
                    <div className="war-room-timer">[{sessionTime}]</div>
                  </div>
                  <div className="war-room-progress-line">
                    <span />
                  </div>
                  <div className="war-room-stats">
                    <WarRoomStat label="SCORE" value={securityScore} suffix="%" />
                    <WarRoomStat label="ATTACKS" value={attacksCount} pad={2} />
                    <WarRoomStat label="BLOCKED" value={blockedCount} pad={2} />
                    <WarRoomStat label="BREACHED" value={successCount} pad={2} />
                    <WarRoomStat label="PACKETS" value={packetsIntercepted} suffix="/sec" />
                  </div>
                </Motion.div>
              </div>

              <div className="dashboard-grid">
                <Motion.section className="map-column" initial={{ opacity: 0, x: -120, rotate: -3 }} whileInView={{ opacity: 1, x: 0, rotate: 0 }} viewport={{ once: true, amount: 0.25 }} transition={PANEL_TRANSITION}>
                  <div className="panel-frame map-frame">
                    <div className="panel-header">
                      <div>
                        <div className="eyebrow">Topology</div>
                        <h3>Network Map</h3>
                      </div>
                      <div className="live-pill">
                        <span className="live-dot" />
                        Live telemetry
                      </div>
                    </div>
                    <div className="map-stage">
                      <div className="hex-grid-overlay" />
                      <NetworkMap
                        scanningNodeId={scanningNodeId}
                        bruteForceTarget={bruteForceTarget}
                        crackedNodeId={crackedNodeId}
                        sqlInjectionTarget={sqlInjectionTarget}
                        injectedNodeId={injectedNodeId}
                        ddosTarget={ddosTarget}
                        ddosStatus={ddosStatus}
                        crashedNodeId={crashedNodeId}
                        firewallEnabled={firewallEnabled}
                        lastAttackEvent={lastAttackEvent}
                        nodeHitCounts={nodeHitCounts}
                      />
                      <div className="map-hud map-hud-top">
                        <span>Threat vectors synced</span>
                        <strong>{isScanning ? "Packet stream active" : "No hostile stream"}</strong>
                      </div>
                      {ddosTarget ? (
                        <div className="map-hud map-hud-bottom">
                          <span>DDoS load</span>
                          <div className="ddos-meter">
                            <div className="ddos-meter-fill" style={{ width: `${Math.min(100, (ddosRequestCount / 5000) * 100)}%` }} />
                          </div>
                          <strong>{ddosRequestCount.toLocaleString()} req/s</strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Motion.section>

                <Motion.aside className="sidebar-column" initial={{ opacity: 0, x: 120 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={PANEL_TRANSITION}>
                  <div className="panel-frame sidebar-frame">
                    <div className="control-stack">
                      <div className="panel-header compact">
                        <div>
                          <div className="eyebrow">Defense Matrix</div>
                          <h3>Control Systems</h3>
                        </div>
                      </div>
                      <div className="defense-toggle-row">
                        <button type="button" onClick={() => toggleDefense("firewall")} className={`defense-toggle ${firewallEnabled ? "active" : ""}`}>
                          <span>Firewall</span>
                          <strong>{firewallEnabled ? "ARMED" : "OFFLINE"}</strong>
                        </button>
                        <button type="button" onClick={() => toggleDefense("ids")} className={`defense-toggle ${idsEnabled ? "active" : ""}`}>
                          <span>IDS</span>
                          <strong>{idsEnabled ? "AUTO" : "MANUAL"}</strong>
                        </button>
                      </div>
                      <button type="button" onClick={handleExportReport} disabled={sessionEvents.length === 0 || isExporting} className="export-button">
                        <span className="export-mark">[]</span>
                        {isExporting ? "Building report..." : "Export PDF report"}
                      </button>
                    </div>

                    <div className="score-card">
                      <div className="panel-header compact">
                        <div>
                          <div className="eyebrow">Integrity Pulse</div>
                          <h3>Security Score</h3>
                        </div>
                      </div>
                      <SecurityScoreRing value={securityScore} />
                    </div>

                    <div className="metric-grid">
                      {topMetrics.map((metric) => (
                        <div key={metric.label} className="metric-card">
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="toolkit-card">
                      <div className="panel-header compact">
                        <div>
                          <div className="eyebrow">Offensive Toolkit</div>
                          <h3>Payload Launchers</h3>
                        </div>
                      </div>
                      <div className="attack-button-stack">
                        {attackDefinitions.map((attack, index) => (
                          <AttackButton key={attack.id} attack={attack} index={index} disabled={isScanning} onClick={() => handleLaunchAttack(attack.id)} />
                        ))}
                      </div>

                      <Motion.button type="button" onClick={handleLaunchAttackChain} disabled={isScanning || attackChainActive} className="attack-chain-button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="chain-button-inner">
                          <span className="chain-icon">⚡</span>
                          <div className="chain-text">
                            <strong>ATTACK CHAIN MODE</strong>
                            {attackChainActive && chainPhase ? (
                              <span className="chain-status">
                                Phase {chainPhase.phase}/{chainPhase.total} - {chainPhase.attack}
                              </span>
                            ) : (
                              <span className="chain-subtitle">Execute all 4 attacks sequentially</span>
                            )}
                          </div>
                          {attackChainActive && <span className="chain-pulse" />}
                        </div>
                      </Motion.button>
                    </div>
                  </div>
                </Motion.aside>
              </div>

              <Motion.section className="terminal-shell" initial={{ opacity: 0, y: 120 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={PANEL_TRANSITION}>
                <div className="panel-frame terminal-frame">
                  <TerminalPanel logs={logs} onClear={() => setLogs([])} onExport={handleExportReport} isExporting={isExporting} />
                </div>
              </Motion.section>

              <Motion.section className="analytics-shell" initial={{ opacity: 0, y: 120 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={PANEL_TRANSITION} style={{ marginTop: "2rem" }}>
                <AnalyticsPanel
                  attackHistory={attackHistory}
                  securityScoreTimeline={securityScoreTimeline}
                  breachTimes={breachTimes}
                  nodeHitCounts={nodeHitCounts}
                  attacksCount={attacksCount}
                  successCount={successCount}
                  blockedCount={blockedCount}
                  historyEvents={historyEvents}
                />
              </Motion.section>
            </section>
          </main>
        </>
      )}
    </div>
  );
}
