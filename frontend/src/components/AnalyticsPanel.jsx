import { useState, useMemo, memo } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const AnalyticsPanel = memo(({
  attackHistory,
  securityScoreTimeline,
  breachTimes,
  nodeHitCounts,
  attacksCount,
  successCount,
  blockedCount,
  historyEvents = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed for performance

  // Calculate success rate per attack type
  const attackStats = useMemo(() => {
    const stats = {
      "port-scan": { total: 0, success: 0 },
      "brute-force": { total: 0, success: 0 },
      "sql-injection": { total: 0, success: 0 },
      ddos: { total: 0, success: 0 },
    };

    attackHistory.forEach((attack) => {
      const type = attack.type;
      if (stats[type]) {
        stats[type].total += 1;
        if (attack.success) stats[type].success += 1;
      }
    });

    return Object.entries(stats).map(([type, data]) => ({
      name: type.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
      total: data.total,
      success: data.success,
    }));
  }, [attackHistory]);

  // Calculate average breach time
  const averageBreachTime = useMemo(() => {
    const successfulAttacks = attackHistory.filter((a) => a.success && a.endTime);
    if (successfulAttacks.length === 0) return 0;

    const totalTime = successfulAttacks.reduce(
      (sum, attack) => sum + (attack.endTime - attack.startTime),
      0
    );
    return Math.round(totalTime / successfulAttacks.length / 1000); // Convert to seconds
  }, [attackHistory]);

  // Find most targeted node
  const mostTargetedNode = useMemo(() => {
    const entries = Object.entries(nodeHitCounts);
    if (entries.length === 0) return { nodeId: "None", count: 0 };

    const [nodeId, count] = entries.reduce((max, current) =>
      current[1] > max[1] ? current : max
    );

    const nodeLabels = {
      router: "Router",
      firewall: "Firewall",
      webserver: "Web Server",
      database: "Database",
      admin: "Admin Panel",
    };

    return { nodeId: nodeLabels[nodeId] || nodeId, count };
  }, [nodeHitCounts]);

  const defenseEfficiency = useMemo(() => {
    const defendedEvents = successCount + blockedCount;
    if (defendedEvents === 0) return 0;
    return Math.round((blockedCount / defendedEvents) * 100);
  }, [blockedCount, successCount]);

  const attackPace = useMemo(() => {
    if (attackHistory.length < 2) return 0;
    const first = attackHistory[0]?.timestamp;
    const last = attackHistory[attackHistory.length - 1]?.timestamp;
    const elapsedMinutes = Math.max(1 / 60, (last - first) / 60000);
    return Math.round((attackHistory.length / elapsedMinutes) * 10) / 10;
  }, [attackHistory]);

  const attackActivityData = useMemo(() => {
    if (attackHistory.length === 0) {
      return [{ mark: "Now", attacks: 0 }];
    }

    const start = attackHistory[0].timestamp;
    const buckets = new Map();
    attackHistory.forEach((attack) => {
      const minuteBucket = Math.floor((attack.timestamp - start) / 60000);
      buckets.set(minuteBucket, (buckets.get(minuteBucket) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([minute, attacks]) => ({
        mark: `${minute}m`,
        attacks,
      }));
  }, [attackHistory]);

  // Format security score timeline for chart
  const scoreChartData = useMemo(() => {
    if (securityScoreTimeline.length === 0) {
      return [{ time: "Start", score: 100 }];
    }

    const startTime = securityScoreTimeline[0]?.timestamp ?? 0;
    return [
      { time: "0s", score: 100, fullTime: 0 },
      ...securityScoreTimeline.map((point) => {
        const elapsed = Math.round((point.timestamp - startTime) / 1000);
        return {
          time: `${elapsed}s`,
          score: point.score,
          event: point.event,
          fullTime: elapsed,
        };
      }),
    ];
  }, [securityScoreTimeline]);

  // Format breach markers
  const breachMarkers = useMemo(() => {
    if (breachTimes.length === 0 || securityScoreTimeline.length === 0) return [];
    
    const startTime = securityScoreTimeline[0]?.timestamp ?? breachTimes[0]?.timestamp ?? 0;
    return breachTimes.map((breach) => {
      const elapsed = Math.round((breach.timestamp - startTime) / 1000);
      // Find corresponding score at this time
      const scorePoint = securityScoreTimeline.find(
        (s) => Math.abs(s.timestamp - breach.timestamp) < 1000
      );
      return {
        time: elapsed,
        attack: breach.attack,
        score: scorePoint?.score || 0,
      };
    });
  }, [breachTimes, securityScoreTimeline]);

  return (
    <Motion.div
      className="relative w-full bg-black/40 backdrop-blur-md border border-[#41ff9b]/20 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-[#41ff9b]/20 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-xl font-bold text-[#41ff9b] tracking-wider">
          📊 ATTACK ANALYTICS DASHBOARD
        </h3>
        <Motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg
            className="w-6 h-6 text-[#41ff9b]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Motion.div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-black/60 border border-[#41ff9b]/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Total Attacks</div>
                  <div className="text-3xl font-bold text-[#41ff9b]">{attacksCount}</div>
                </div>
                <div className="bg-black/60 border border-[#ff5b5b]/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                  <div className="text-3xl font-bold text-[#ff5b5b]">
                    {attacksCount > 0 ? Math.round((successCount / attacksCount) * 100) : 0}%
                  </div>
                </div>
                <div className="bg-black/60 border border-[#ff9b4a]/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Avg Breach Time</div>
                  <div className="text-3xl font-bold text-[#ff9b4a]">
                    {averageBreachTime}s
                  </div>
                </div>
                <div className="bg-black/60 border border-[#c074ff]/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Most Targeted</div>
                  <div className="text-lg font-bold text-[#c074ff] truncate">
                    {mostTargetedNode.nodeId}
                  </div>
                  <div className="text-xs text-gray-500">({mostTargetedNode.count} hits)</div>
                </div>
                <div className="bg-black/60 border border-[#55c7ff]/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Defense Efficiency</div>
                  <div className="text-3xl font-bold text-[#55c7ff]">{defenseEfficiency}%</div>
                </div>
                <div className="bg-black/60 border border-[#ffd166]/30 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Attack Pace</div>
                  <div className="text-3xl font-bold text-[#ffd166]">{attackPace}</div>
                  <div className="text-xs text-gray-500">attacks / min</div>
                </div>
              </div>

              {/* Attack activity trend */}
              <div className="bg-black/60 border border-[#55c7ff]/30 rounded-lg p-4">
                <h4 className="text-lg font-bold text-[#55c7ff] mb-4">
                  Attack Activity Trend
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={attackActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="mark" stroke="#888" />
                    <YAxis allowDecimals={false} stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "1px solid #55c7ff",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="attacks"
                      stroke="#55c7ff"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Session history */}
              <div className="bg-black/60 border border-[#f3f4f6]/20 rounded-lg p-4">
                <h4 className="text-lg font-bold text-white mb-4">
                  Session History (Latest Events)
                </h4>
                {historyEvents.length === 0 ? (
                  <div className="text-sm text-gray-400">No events recorded yet.</div>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-white/10 rounded-md">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-black/90 text-gray-300">
                        <tr>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Attack</th>
                          <th className="px-3 py-2">Node</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyEvents.slice(0, 20).map((event) => (
                          <tr key={event.id} className="border-t border-white/10 text-gray-200">
                            <td className="px-3 py-2">{new Date(event.timestamp).toLocaleTimeString()}</td>
                            <td className="px-3 py-2">{event.type}</td>
                            <td className="px-3 py-2">{event.attack || "-"}</td>
                            <td className="px-3 py-2">{event.nodeId || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Success Rate by Attack Type */}
              <div className="bg-black/60 border border-[#41ff9b]/30 rounded-lg p-4">
                <h4 className="text-lg font-bold text-[#41ff9b] mb-4">
                  Success Rate by Attack Type
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={attackStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "1px solid #41ff9b",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="successRate" fill="#41ff9b" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Security Score History */}
              <div className="bg-black/60 border border-[#ff5b5b]/30 rounded-lg p-4">
                <h4 className="text-lg font-bold text-[#ff5b5b] mb-4">
                  Security Score Timeline
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={scoreChartData}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff5b5b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ff5b5b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#888" />
                    <YAxis domain={[0, 100]} stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "1px solid #ff5b5b",
                        borderRadius: "8px",
                      }}
                      formatter={(value, name, props) => {
                        if (name === "score") {
                          return [value, props.payload.event || "Security Score"];
                        }
                        return [value, name];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#ff5b5b"
                      strokeWidth={3}
                      fill="url(#scoreGradient)"
                      isAnimationActive={false}
                    />
                    {/* Breach markers */}
                    {breachMarkers.map((marker, index) => (
                      <text
                        key={index}
                        x={`${(marker.time / scoreChartData[scoreChartData.length - 1]?.fullTime) * 100}%`}
                        y={10}
                        fill="#ff5b5b"
                        fontSize="20"
                        textAnchor="middle"
                      >
                        ⚠️
                      </text>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
});

AnalyticsPanel.displayName = 'AnalyticsPanel';

export default AnalyticsPanel;
