import { useEffect, useRef, useState } from 'react';
import useSiegeStore from '../store/siegeStore';
import { WS_URL } from '../config';
import { NODE_LABELS } from '../constants';

/**
 * useWebSocket - Handles background communication with the simulation server.
 * Subscribes to the /ws endpoint and routes messages to the Zustand store.
 * Manages automatic reconnection with a 3s backoff.
 */
export default function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const store = useSiegeStore();
  const reconnectTimeoutRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        store.addLog("SYSTEM", "WebSocket connected", "success");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // 1. Add to global history
          store.addHistoryEvent({
            type: data.type,
            attack: data.attack || null,
            nodeId: data.nodeId || data.targetId || null,
            severity: data.severity || null,
            payload: data,
          });

          // 2. Route messages by type
          switch (data.type) {
            case "ATTACK_START":
              store.addLog("ATTACK", `Initiating ${data.attack} cluster sequence...`, "warning");
              store.addSessionEvent({
                attack: data.attack,
                phase: "ATTACK_START",
                outcome: "STARTED",
                details: `${data.attack} cluster sequence initiated`,
              });
              store.incrementAttacksCount();
              store.setIsScanning(true);
              store.addAttackHistory({ id: Date.now(), type: data.attack, timestamp: Date.now(), startTime: Date.now(), success: false });
              break;

            case "NODE_SCAN_START":
              store.setScanningNodeId(data.nodeId);
              store.addLog("SCAN", `Scanning node [${data.label}]...`, "info");
              store.addSessionEvent({ attack: "Port Scan", phase: "NODE_SCAN_START", targetId: data.nodeId, targetLabel: data.label, outcome: "SCANNING", details: `Port reconnaissance started on ${data.label}` });
              store.setLastAttackEvent({ type: "port-scan", targetId: data.nodeId, timestamp: Date.now() });
              store.updateNodeHitCount(data.nodeId);
              break;

            case "SCAN_RESULT":
              store.addLog("PORT", `  - ${data.port}/${data.status}`, data.status === "OPEN" ? "success" : "info");
              if (data.status === "OPEN") {
                store.addSessionEvent({ attack: "Port Scan", phase: "SCAN_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "OPEN_PORT", details: `Discovered open port ${data.port}` });
              }
              break;

            case "ATTACK_END":
              store.setScanningNodeId(null);
              store.setIsScanning(false);
              store.setBruteForceTarget(null);
              store.setSqlInjectionTarget(null);
              store.setDdosTarget(null);
              store.setDdosStatus(null);
              store.addLog("SYSTEM", `${data.attack} cycle completed.`, "success");
              store.addSessionEvent({ attack: data.attack, phase: "ATTACK_END", outcome: "COMPLETED", details: `${data.attack} cycle completed` });
              break;

            case "DDOS_TARGET":
              store.setDdosTarget(data.nodeId);
              store.setDdosRequestCount(100);
              store.addLog("DDOS", `Flooding node [${data.label}] with requests...`, "warning");
              store.addSessionEvent({ attack: "DDoS", phase: "DDOS_TARGET", targetId: data.nodeId, targetLabel: data.label, outcome: "TARGETED", details: `DDoS flood started against ${data.label}` });
              store.updateNodeHitCount(data.nodeId);
              break;

            case "DDOS_WAVE":
              store.setDdosStatus(data.status);
              store.setDdosRequestCount(data.count);
              store.addLog("TRAFFIC", `  [Wave ${data.wave}] Load: ${data.count.toLocaleString()} req/s`, data.status === "OVERLOADING" ? "danger" : "warning");
              store.addSessionEvent({ attack: "DDoS", phase: "DDOS_WAVE", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: data.status, details: `Wave ${data.wave} reached ${data.count.toLocaleString()} req/s` });
              store.setLastAttackEvent({ type: "ddos", targetId: "webserver", timestamp: Date.now() });
              break;

            case "DDOS_CRASH":
              store.crashNode(data.nodeId);
              store.setDdosStatus("CRASHED");
              store.setDdosTarget(null);
              store.addLog("CRITICAL", "Node is OFFLINE. Packet loss: 100%", "danger");
              store.addSessionEvent({ attack: "DDoS", phase: "DDOS_CRASH", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "CRASHED", details: "Service crash confirmed after sustained overload" });
              store.incrementSuccessCount();
              store.addBreachTime({ attack: "DDoS", timestamp: Date.now(), nodeId: data.nodeId });
              store.dropSecurityScore(40, "DDoS Crash");
              store.setAttackHistory((prev) => {
                const updated = [...prev];
                const lastAttack = updated[updated.length - 1];
                if (lastAttack && !lastAttack.success) {
                  lastAttack.success = true;
                  lastAttack.endTime = Date.now();
                }
                return updated;
              });
              break;

            case "BRUTE_TARGET":
              store.setBruteForceTarget(data.nodeId);
              store.addLog("BRUTE", `Starting dictionary attack on [${data.label}]...`, "warning");
              store.addSessionEvent({ attack: "Brute Force", phase: "BRUTE_TARGET", targetId: data.nodeId, targetLabel: data.label, outcome: "TARGETED", details: `Credential attack started against ${data.label}` });
              store.updateNodeHitCount(data.nodeId);
              break;

            case "BRUTE_RESULT":
              if (data.result === "CRACKED") {
                store.crackNode(data.nodeId);
                store.setBruteForceTarget(null);
                store.addLog("ACCESS", `SUCCESS! Credentials decrypted: ${data.password}`, "success");
                store.addSessionEvent({ attack: "Brute Force", phase: "BRUTE_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "CRACKED", details: `Valid credentials recovered: ${data.password}` });
                store.incrementSuccessCount();
                store.addBreachTime({ attack: "Brute Force", timestamp: Date.now(), nodeId: data.nodeId });
                store.dropSecurityScore(25, "Brute Force Breach");
                store.setAttackHistory((prev) => {
                  const updated = [...prev];
                  const lastAttack = updated[updated.length - 1];
                  if (lastAttack && !lastAttack.success) {
                    lastAttack.success = true;
                    lastAttack.endTime = Date.now();
                  }
                  return updated;
                });
                store.setLastAttackEvent({ type: "brute-force", targetId: data.nodeId, timestamp: Date.now(), result: "CRACKED" });
              } else {
                store.addLog("FAIL", `  - Attempt [${data.password}] - Rejected`, "info");
                store.addSessionEvent({ attack: "Brute Force", phase: "BRUTE_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: "FAILED", details: `Rejected credential candidate: ${data.password}` });
                store.setLastAttackEvent({ type: "brute-force", targetId: data.nodeId, timestamp: Date.now(), result: "FAILED" });
              }
              break;

            case "SQL_TARGET":
              store.setSqlInjectionTarget(data.nodeId);
              store.addLog("SQL", `Injecting payload into [${data.label}]...`, "warning");
              store.addSessionEvent({ attack: "SQL Injection", phase: "SQL_TARGET", targetId: data.nodeId, targetLabel: data.label, outcome: "TARGETED", details: `Injection phase started against ${data.label}` });
              store.updateNodeHitCount(data.nodeId);
              break;

            case "SQL_RESULT":
              store.addLog("INJECT", `  - Payload: ${data.payload} -> ${data.result}`, data.result === "INJECTED" ? "sql" : "info");
              store.addSessionEvent({ attack: "SQL Injection", phase: "SQL_RESULT", targetId: data.nodeId, targetLabel: NODE_LABELS[data.nodeId] || data.nodeId, outcome: data.result, details: `Payload result: ${data.payload}` });
              if (data.result === "INJECTED") {
                store.injectNode(data.nodeId);
                store.setSqlInjectionTarget(null);
                store.incrementSuccessCount();
                store.addBreachTime({ attack: "SQL Injection", timestamp: Date.now(), nodeId: data.nodeId });
                store.setAttackHistory((prev) => {
                  const updated = [...prev];
                  const lastAttack = updated[updated.length - 1];
                  if (lastAttack && !lastAttack.success) {
                    lastAttack.success = true;
                    lastAttack.endTime = Date.now();
                  }
                  return updated;
                });
              }
              store.setLastAttackEvent({ type: "sql-injection", targetId: data.nodeId, timestamp: Date.now(), result: data.result });
              break;

            case "DATA_EXFILTRATED":
              store.addLog("EXFIL", "Data extraction started:", "success");
              data.data.forEach((record) => store.addLog("DATA", `  -> user:${record.user} | pass:${record.pass}`, "info"));
              store.addSessionEvent({ attack: "SQL Injection", phase: "DATA_EXFILTRATED", targetId: "database", targetLabel: "Database", outcome: "EXFILTRATED", details: `Extracted ${data.data.length} database records` });
              store.dropSecurityScore(30, "Data Exfiltration");
              break;

            case "FIREWALL_STATUS":
              store.setFirewallEnabled(data.enabled);
              store.addLog("DEFENSE", `Firewall state: ${data.enabled ? "ACTIVE" : "INACTIVE"}`, data.enabled ? "success" : "info");
              break;

            case "IDS_STATUS":
              store.setIdsEnabled(data.enabled);
              store.addLog("DEFENSE", `IDS monitor: ${data.enabled ? "RUNNING" : "STOPPED"}`, data.enabled ? "success" : "info");
              break;

            case "IDS_ALERT":
              store.addIdsAlert(data);
              store.addLog("ALERT", `[${data.severity}] ${data.threat}`, "danger");
              break;

            case "FIREWALL_BLOCK":
              store.addLog("BLOCKED", `Shields up: ${data.message}`, "success");
              store.addSessionEvent({ attack: "Defense", phase: "FIREWALL_BLOCK", outcome: "BLOCKED", details: data.message });
              store.incrementBlockedCount();
              store.raiseSecurityScore(5, "Firewall Block");
              break;

            case "ATTACK_CHAIN_START":
              store.setAttackChainActive(true);
              store.addLog("CHAIN", "APT-STYLE ATTACK CHAIN INITIATED", "danger");
              break;

            case "CHAIN_PHASE":
              store.setChainPhase({ phase: data.phase, total: data.total, attack: data.attack });
              store.addLog("CHAIN", `>>> ${data.message} <<<`, "warning");
              break;

            case "ATTACK_CHAIN_COMPLETE":
              store.setAttackChainActive(false);
              store.setChainPhase(null);
              store.addLog("CHAIN", "ATTACK CHAIN COMPLETE - ALL PHASES EXECUTED", "success");
              break;

            case "ZERO_DAY_START":
              store.addSessionEvent({
                attack: "Zero Day",
                phase: "ZERO_DAY_START",
                outcome: "STARTED",
                details: "CVE-2024-SIEGE authorization accepted",
              });
              break;

            case "ZERO_DAY_PHASE":
              store.setZeroDayTimelineEntries((prev) => [...prev, data.label]);
              store.addSessionEvent({
                attack: "Zero Day",
                phase: "ZERO_DAY_PHASE",
                targetId: data.node,
                targetLabel: data.node ? NODE_LABELS[data.node] || data.node : null,
                outcome: data.node ? "COMPROMISED" : "EXECUTING",
                details: data.label,
              });
              break;

            case "ZERO_DAY_COMPLETE":
              store.setZeroDayStats(data.stats);
              store.setZeroDayTimelineEntries((prev) => [...prev, "ALL SYSTEMS COMPROMISED... SIEGE COMPLETE"]);
              store.addSessionEvent({
                attack: "Zero Day",
                phase: "ZERO_DAY_COMPLETE",
                outcome: "COMPLETE",
                details: "Total system compromise confirmed",
              });
              break;

            default:
              console.warn("Unrouted WebSocket message type:", data.type);
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = window.setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { isConnected };
}
