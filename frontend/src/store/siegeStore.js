import { create } from 'zustand'

const ZERO_DAY_DEFAULT_STATS = {
  nodes_compromised: 5,
  credentials_stolen: 847,
  firewall_rules_bypassed: 12,
  detection_evasions: 9,
};

const useSiegeStore = create((set, get) => ({

  // ── ATTACK SLICE ──────────────────────────────
  logs: [],
  sessionEvents: [],
  scanningNodeId: null,
  isScanning: false,
  bruteForceTarget: null,
  crackedNodeId: null,
  sqlInjectionTarget: null,
  injectedNodeId: null,
  ddosTarget: null,
  ddosStatus: null,
  ddosRequestCount: 0,
  crashedNodeId: null,

  // ── DEFENSE SLICE ─────────────────────────────
  firewallEnabled: false,
  idsEnabled: false,
  idsAlerts: [],
  securityScore: 100,

  // ── UI SLICE ──────────────────────────────────
  showLoader: true,
  lastAttackEvent: null,
  edgeFlashColor: '',
  edgeFlashKey: 0,
  isExporting: false,

  // ── ANALYTICS SLICE ───────────────────────────
  attacksCount: 0,
  successCount: 0,
  blockedCount: 0,
  compromisedNodeIds: new Set(),
  attackHistory: [],
  nodeHitCounts: {},
  securityScoreTimeline: [],
  breachTimes: [],
  attackChainActive: false,
  chainPhase: null,
  historyEvents: [],
  sessionStartTime: Date.now(),

  // ── ZERO DAY SLICE ────────────────────────────
  zeroDayUnlocked: false,
  zeroDayActive: false,
  zeroDayPhase: null,
  zeroDayStats: ZERO_DAY_DEFAULT_STATS,
  zeroDayTimelineEntries: [],
  zeroDayTintVisible: false,
  zeroDayOverlayVisible: false,
  zeroDayLogsInjected: false,

  // ── ACTIONS ───────────────────────────────────

  // Logs
  addLog: (tag, text, type) => {
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
    set((s) => ({ logs: [...s.logs, { timestamp, tag, text, type }] }));
  },
  addLogEntry: (entry) => set((s) => ({ logs: [...s.logs, entry] })),
  clearLogs: () => set({ logs: [] }),

  // Session Events
  addSessionEvent: (event) => set((s) => ({
    sessionEvents: [
      ...s.sessionEvents,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        ...event,
      },
    ],
  })),

  // Attack actions
  setScanningNodeId: (id) => set({ scanningNodeId: id }),
  setIsScanning: (v) => set({ isScanning: v }),
  setBruteForceTarget: (id) => set({ bruteForceTarget: id }),
  crackNode: (id) => set((s) => ({
    crackedNodeId: id,
    compromisedNodeIds: new Set([...s.compromisedNodeIds, id]),
  })),
  setSqlInjectionTarget: (id) => set({ sqlInjectionTarget: id }),
  injectNode: (id) => set((s) => ({
    injectedNodeId: id,
    compromisedNodeIds: new Set([...s.compromisedNodeIds, id]),
  })),
  setDdosTarget: (id) => set({ ddosTarget: id }),
  setDdosStatus: (v) => set({ ddosStatus: v }),
  setDdosRequestCount: (v) => set({ ddosRequestCount: v }),
  crashNode: (id) => set((s) => ({
    crashedNodeId: id,
    compromisedNodeIds: new Set([...s.compromisedNodeIds, id]),
  })),
  markCompromisedNode: (id) => set((s) => {
    const next = new Set(s.compromisedNodeIds);
    next.add(id);
    return { compromisedNodeIds: next };
  }),

  // Defense actions
  setFirewallEnabled: (v) => set({ firewallEnabled: v }),
  toggleFirewall: () => set((s) => ({ firewallEnabled: !s.firewallEnabled })),
  setIdsEnabled: (v) => set({ idsEnabled: v }),
  toggleIds: () => set((s) => ({ idsEnabled: !s.idsEnabled })),
  addIdsAlert: (alert) => {
    const alertId = Date.now() + Math.random();
    set((s) => ({ idsAlerts: [{ id: alertId, ...alert }, ...s.idsAlerts].slice(0, 3) }));
    return alertId;
  },
  removeIdsAlert: (id) => set((s) => ({
    idsAlerts: s.idsAlerts.filter((a) => a.id !== id),
  })),
  setSecurityScore: (score) => set({ securityScore: score }),
  dropSecurityScore: (amount, eventName = "Attack") => set((s) => {
    const newScore = Math.max(0, s.securityScore - amount);
    return {
      securityScore: newScore,
      securityScoreTimeline: [...s.securityScoreTimeline, {
        timestamp: Date.now(),
        score: newScore,
        event: eventName
      }],
    };
  }),
  raiseSecurityScore: (amount, eventName = "Defense") => set((s) => {
    const newScore = Math.min(100, s.securityScore + amount);
    return {
      securityScore: newScore,
      securityScoreTimeline: [...s.securityScoreTimeline, {
        timestamp: Date.now(),
        score: newScore,
        event: eventName
      }],
    };
  }),

  // Analytics actions
  setAttacksCount: (v) => set({ attacksCount: typeof v === 'function' ? v(get().attacksCount) : v }),
  incrementAttacksCount: () => set((s) => ({ attacksCount: s.attacksCount + 1 })),
  setSuccessCount: (v) => set({ successCount: typeof v === 'function' ? v(get().successCount) : v }),
  incrementSuccessCount: () => set((s) => ({ successCount: s.successCount + 1 })),
  setBlockedCount: (v) => set({ blockedCount: typeof v === 'function' ? v(get().blockedCount) : v }),
  incrementBlockedCount: () => set((s) => ({ blockedCount: s.blockedCount + 1 })),
  setAttackHistory: (v) => set({ attackHistory: typeof v === 'function' ? v(get().attackHistory) : v }),
  addAttackHistory: (entry) => set((s) => ({
    attackHistory: [...s.attackHistory, entry],
  })),
  setNodeHitCounts: (v) => set({ nodeHitCounts: typeof v === 'function' ? v(get().nodeHitCounts) : v }),
  updateNodeHitCount: (nodeId) => set((s) => ({
    nodeHitCounts: {
      ...s.nodeHitCounts,
      [nodeId]: (s.nodeHitCounts[nodeId] || 0) + 1,
    },
  })),
  setBreachTimes: (v) => set({ breachTimes: typeof v === 'function' ? v(get().breachTimes) : v }),
  addBreachTime: (entry) => set((s) => ({
    breachTimes: [...s.breachTimes, entry],
  })),
  setAttackChainActive: (v) => set({ attackChainActive: v }),
  setChainPhase: (v) => set({ chainPhase: v }),
  setHistoryEvents: (v) => set({ historyEvents: typeof v === 'function' ? v(get().historyEvents) : v }),
  addHistoryEvent: (event) => set((s) => ({
    historyEvents: [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        ...event,
      },
      ...s.historyEvents,
    ].slice(0, 150),
  })),

  // Zero Day actions
  setZeroDayUnlocked: (v) => set({ zeroDayUnlocked: v }),
  setZeroDayActive: (v) => set({ zeroDayActive: v }),
  setZeroDayPhase: (v) => set({ zeroDayPhase: v }),
  setZeroDayStats: (v) => set({ zeroDayStats: v }),
  setZeroDayTimelineEntries: (v) => set({ zeroDayTimelineEntries: typeof v === 'function' ? v(get().zeroDayTimelineEntries) : v }),
  setZeroDayTintVisible: (v) => set({ zeroDayTintVisible: v }),
  setZeroDayOverlayVisible: (v) => set({ zeroDayOverlayVisible: v }),
  setZeroDayLogsInjected: (v) => set({ zeroDayLogsInjected: v }),

  // UI actions
  hideLoader: () => set({ showLoader: false }),
  setLastAttackEvent: (event) => set({ lastAttackEvent: event }),
  setEdgeFlashColor: (color) => set({ edgeFlashColor: color }),
  setEdgeFlashKey: (v) => set({ edgeFlashKey: typeof v === 'function' ? v(get().edgeFlashKey) : v }),
  triggerEdgeFlash: (color) => set((s) => ({
    edgeFlashColor: color,
    edgeFlashKey: s.edgeFlashKey + 1,
  })),
  setIsExporting: (v) => set({ isExporting: v }),

  // Full reset
  resetAll: () => set({
    logs: [],
    sessionEvents: [],
    scanningNodeId: null,
    isScanning: false,
    bruteForceTarget: null,
    crackedNodeId: null,
    sqlInjectionTarget: null,
    injectedNodeId: null,
    ddosTarget: null,
    ddosStatus: null,
    ddosRequestCount: 0,
    crashedNodeId: null,
    firewallEnabled: false,
    idsEnabled: false,
    idsAlerts: [],
    securityScore: 100,
    attacksCount: 0,
    successCount: 0,
    blockedCount: 0,
    compromisedNodeIds: new Set(),
    attackHistory: [],
    nodeHitCounts: {},
    securityScoreTimeline: [],
    breachTimes: [],
    attackChainActive: false,
    chainPhase: null,
    zeroDayUnlocked: false,
    zeroDayActive: false,
    zeroDayPhase: null,
    zeroDayStats: ZERO_DAY_DEFAULT_STATS,
    zeroDayTimelineEntries: [],
    zeroDayTintVisible: false,
    zeroDayOverlayVisible: false,
    zeroDayLogsInjected: false,
    lastAttackEvent: null,
    sessionStartTime: Date.now(),
  }),
}))

export default useSiegeStore
