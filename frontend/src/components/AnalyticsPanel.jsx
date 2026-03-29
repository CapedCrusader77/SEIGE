import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSiegeStore from "../store/siegeStore";
import useAttackHandlers from "../hooks/useAttackHandlers";
import { generateSessionReport } from "../utils/reportGenerator";

const CHART_COLORS = ["#41ff9b", "#ffb141", "#c074ff", "#ff5b5b", "#55c7ff", "#ff7a31"];

const formatSeconds = (seconds) => {
  if (!seconds) return "N/A";
  return `${seconds.toFixed(1)}s`;
};

const getBreachRate = (successCount, attacksCount) =>
  attacksCount > 0 ? Math.round((successCount / attacksCount) * 100) : 0;

const getDefenseEfficiency = (blockedCount, attacksCount) =>
  attacksCount > 0 ? Math.round((blockedCount / attacksCount) * 100) : 0;

const AnalyticsPanel = memo(function AnalyticsPanel({ sessionTime, packetsIntercepted }) {
  const store = useSiegeStore();
  
  const attacksCount = store.attacksCount;
  const successCount = store.successCount;
  const blockedCount = store.blockedCount;
  const compromisedNodeIds = [...store.compromisedNodeIds];
  const securityScoreTimeline = store.securityScoreTimeline || [];
  const breachTimes = store.breachTimes || [];
  const nodeHitCounts = store.nodeHitCounts || {};
  const sessionEvents = store.sessionEvents || [];
  const historyEvents = store.historyEvents || [];
  const securityScore = store.securityScore;
  const isExporting = store.isExporting;
  const setIsExporting = store.setIsExporting;
  const zeroDayPhase = store.zeroDayPhase;
  const zeroDayStats = store.zeroDayStats;
  const zeroDayTimelineEntries = store.zeroDayTimelineEntries || [];

  const attackMix = useMemo(() => {
    const counts = new Map();

    sessionEvents.forEach((event) => {
      if (!event.attack || event.phase !== "ATTACK_START") {
        return;
      }
      counts.set(event.attack, (counts.get(event.attack) || 0) + 1);
    });

    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [sessionEvents]);

  const nodePressure = useMemo(
    () =>
      Object.entries(nodeHitCounts)
        .map(([node, hits]) => ({
          node: node.replace("webserver", "web").replace("database", "db").replace("firewall", "fw"),
          hits,
        }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 5),
    [nodeHitCounts],
  );

  const scoreTrend = useMemo(() => {
    if (securityScoreTimeline.length === 0) {
      return [{ step: "Start", score: 100 }];
    }

    return securityScoreTimeline.map((point, index) => ({
      step: index + 1,
      score: point.score,
      event: point.event,
    }));
  }, [securityScoreTimeline]);

  const meanTimeToCompromise = useMemo(() => {
    if (breachTimes.length < 1 || !store.sessionStartTime) {
      return 0;
    }

    const durations = breachTimes.map((entry) => Math.max(0, (entry.timestamp - store.sessionStartTime) / 1000));
    return durations.reduce((sum, value) => sum + value, 0) / durations.length;
  }, [breachTimes, store.sessionStartTime]);

  const handleExportReport = async () => {
    try {
      setIsExporting(true);

      await new Promise((resolve) => window.setTimeout(resolve, 80));

      generateSessionReport({
        attacksCount,
        successCount,
        blockedCount,
        compromisedNodeIds,
        securityScore,
        sessionEvents,
        historyEvents,
        securityScoreTimeline,
        zeroDayExecuted: zeroDayPhase === "complete",
        zeroDayStats,
        zeroDayTimeline: zeroDayTimelineEntries,
        sessionTime,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="panel-frame analytics-shell">
      <div className="panel-header compact analytics-header">
        <div>
          <span className="eyebrow">SESSION PERFORMANCE TELEMETRY</span>
          <h3>ANALYTICS & METRICS</h3>
        </div>
        <div className="header-meta analytics-version">v.0.8.2 // STABLE</div>
      </div>

      <div className="analytics-content">
        <div className="metric-grid">
          <div className="metric-card">
            <span>TOTAL SEQUENCES</span>
            <strong>{attacksCount}</strong>
          </div>
          <div className="metric-card">
            <span>NODE COMPROMISES</span>
            <strong>{successCount}</strong>
          </div>
          <div className="metric-card">
            <span>BLOCKED VECTORS</span>
            <strong>{blockedCount}</strong>
          </div>
          <div className="metric-card">
            <span>LIVE SECURITY SCORE</span>
            <strong>{securityScore}%</strong>
          </div>
          <div className="metric-card">
            <span>BREACH RATE</span>
            <strong>{getBreachRate(successCount, attacksCount)}%</strong>
          </div>
          <div className="metric-card">
            <span>DEFENSE EFFICIENCY</span>
            <strong>{getDefenseEfficiency(blockedCount, attacksCount)}%</strong>
          </div>
          <div className="metric-card">
            <span>PACKETS INTERCEPTED</span>
            <strong>{packetsIntercepted}</strong>
          </div>
          <div className="metric-card">
            <span>MEAN TIME TO BREACH</span>
            <strong>{formatSeconds(meanTimeToCompromise)}</strong>
          </div>
          <div className="metric-card">
            <span>COMPROMISED NODES</span>
            <strong>{compromisedNodeIds.length}</strong>
          </div>
        </div>

        <div className="analytics-chart-grid">
          <div className="analytics-card">
            <div className="analytics-card-head">
              <span className="eyebrow">Trend</span>
              <strong>Security Score Timeline</strong>
            </div>
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrend}>
                  <CartesianGrid stroke="rgba(118, 141, 173, 0.15)" vertical={false} />
                  <XAxis dataKey="step" stroke="#8d99a8" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#8d99a8" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#07101b", border: "1px solid rgba(118, 141, 173, 0.28)" }}
                    labelStyle={{ color: "#edf5ff" }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#ff7a31" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-card-head">
              <span className="eyebrow">Mix</span>
              <strong>Attack Distribution</strong>
            </div>
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attackMix.length ? attackMix : [{ name: "Idle", value: 1 }]} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={4}>
                    {(attackMix.length ? attackMix : [{ name: "Idle", value: 1 }]).map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#07101b", border: "1px solid rgba(118, 141, 173, 0.28)" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="analytics-card analytics-card-wide">
            <div className="analytics-card-head">
              <span className="eyebrow">Targeting</span>
              <strong>Node Pressure Map</strong>
            </div>
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nodePressure.length ? nodePressure : [{ node: "none", hits: 0 }]}>
                  <CartesianGrid stroke="rgba(118, 141, 173, 0.15)" vertical={false} />
                  <XAxis dataKey="node" stroke="#8d99a8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#8d99a8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#07101b", border: "1px solid rgba(118, 141, 173, 0.28)" }} />
                  <Bar dataKey="hits" radius={[8, 8, 0, 0]} fill="#55c7ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="analytics-actions">
          <div className="toolkit-card" style={{ gridColumn: "1 / -1" }}>
            <div className="analytics-card-head">
              <span className="eyebrow">Reporting</span>
              <strong>PDF Session Report</strong>
            </div>
            <p className="analytics-note">
              Export an executive summary, risk trend analysis, recommendations, and the detailed timeline for this run.
            </p>
            <button type="button" className="export-button" onClick={handleExportReport} disabled={isExporting}>
              <span className="export-mark">PDF</span>
              {isExporting ? "Generating Report..." : "Export Full Session Report"}
            </button>
            <div className="analytics-footer-stats">
              <span>Runtime: {sessionTime}</span>
              <span>Alerts logged: {historyEvents.length}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default AnalyticsPanel;
