import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const INITIAL_LAYOUT = [
  { id: "router", label: "Router", x: 400, y: 100 },
  { id: "firewall", label: "Firewall", x: 400, y: 250 },
  { id: "webserver", label: "Web Server", x: 250, y: 420 },
  { id: "database", label: "Database", x: 550, y: 420 },
  { id: "admin", label: "Admin Panel", x: 400, y: 560 },
];

const formatDateTime = (timestamp) =>
  new Date(timestamp).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

const buildAsciiDiagram = (compromisedNodeIds) => {
  const compromised = new Set(compromisedNodeIds);
  const marker = (nodeId) => (compromised.has(nodeId) ? "[X]" : "[ ]");

  return [
    `               ${marker("router")} ROUTER`,
    "                    |",
    `               ${marker("firewall")} FIREWALL`,
    "               /            \\",
    `  ${marker("webserver")} WEB SERVER        ${marker("database")} DATABASE`,
    "               \\            /",
    `              ${marker("admin")} ADMIN PANEL`,
  ].join("\n");
};

const getMostVulnerableNode = (sessionEvents) => {
  const counts = new Map();

  sessionEvents.forEach((event) => {
    if (!event.targetId) {
      return;
    }

    if (!["FAILED", "CRACKED", "INJECTED", "BLOCKED", "CRASHED", "TARGETED"].includes(event.outcome)) {
      return;
    }

    counts.set(event.targetId, (counts.get(event.targetId) || 0) + 1);
  });

  let bestNodeId = null;
  let bestCount = -1;

  counts.forEach((count, nodeId) => {
    if (count > bestCount) {
      bestNodeId = nodeId;
      bestCount = count;
    }
  });

  if (!bestNodeId) {
    return null;
  }

  const match = INITIAL_LAYOUT.find((node) => node.id === bestNodeId);
  return {
    id: bestNodeId,
    label: match?.label || bestNodeId,
    count: bestCount,
  };
};

const buildExecutiveSummary = ({
  attacksCount,
  successCount,
  blockedCount,
  compromisedNodeIds,
  securityScore,
  sessionEvents,
}) => {
  const vulnerableNode = getMostVulnerableNode(sessionEvents);
  const compromisedList = compromisedNodeIds
    .map((nodeId) => INITIAL_LAYOUT.find((node) => node.id === nodeId)?.label || nodeId)
    .join(", ");

  const summary = [
    `This report covers the active browser session and summarizes ${attacksCount} launched attack sequence(s).`,
    `The environment finished with a security score of ${securityScore}% and recorded ${successCount} successful offensive outcome(s).`,
    blockedCount > 0
      ? `Defensive controls interrupted ${blockedCount} attack path(s) during the session.`
      : "No attack paths were stopped by firewall controls during the session.",
  ];

  if (compromisedNodeIds.length > 0) {
    summary.push(`Compromised assets: ${compromisedList}.`);
  } else {
    summary.push("No nodes were marked as compromised in this session.");
  }

  if (vulnerableNode) {
    summary.push(`Most targeted asset: ${vulnerableNode.label} (${vulnerableNode.count} notable events).`);
  }

  return {
    summary,
    vulnerableNode,
  };
};

const buildRecommendations = ({
  compromisedNodeIds,
  blockedCount,
  firewallEnabled,
  idsEnabled,
  sessionEvents,
}) => {
  const compromised = new Set(compromisedNodeIds);
  const recommendations = [];

  if (compromised.has("admin")) {
    recommendations.push({
      priority: "HIGH",
      text: "Rotate Admin Panel credentials immediately and enforce MFA for privileged access.",
    });
  }

  if (compromised.has("database") || sessionEvents.some((event) => event.attack === "SQL Injection")) {
    recommendations.push({
      priority: "HIGH",
      text: "Harden the database tier with parameterized queries, WAF filtering, and least-privilege service accounts.",
    });
  }

  if (compromised.has("webserver") || sessionEvents.some((event) => event.phase === "DDOS_WAVE")) {
    recommendations.push({
      priority: "HIGH",
      text: "Add DDoS rate limiting, upstream scrubbing, and autoscaling thresholds for the web tier.",
    });
  }

  if (!firewallEnabled || blockedCount === 0) {
    recommendations.push({
      priority: "MEDIUM",
      text: "Keep firewall enabled during simulations and tune policies to interrupt more attack paths.",
    });
  }

  if (!idsEnabled) {
    recommendations.push({
      priority: "MEDIUM",
      text: "Enable IDS by default so reconnaissance and brute-force activity creates earlier operator alerts.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "LOW",
      text: "Maintain the current layered defenses and validate controls against repeated attack chains.",
    });
  }

  return recommendations.slice(0, 5);
};

const buildAttackBreakdown = (sessionEvents) => {
  const counters = new Map();

  sessionEvents.forEach((event) => {
    if (!event.attack) return;
    if (!counters.has(event.attack)) {
      counters.set(event.attack, { attack: event.attack, events: 0, successes: 0, blocked: 0 });
    }

    const bucket = counters.get(event.attack);
    bucket.events += 1;
    if (["CRACKED", "INJECTED", "CRASHED", "OPEN_PORT"].includes(event.outcome)) {
      bucket.successes += 1;
    }
    if (["BLOCKED", "FIREWALL_BLOCK"].includes(event.outcome)) {
      bucket.blocked += 1;
    }
  });

  return [...counters.values()].sort((a, b) => b.events - a.events);
};

const calculateMeanTimeToCompromise = (sessionEvents) => {
  const startByAttack = new Map();
  const durations = [];

  [...sessionEvents]
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((event) => {
      if (event.phase === "ATTACK_START" && event.attack) {
        startByAttack.set(event.attack, event.timestamp);
        return;
      }

      if (["CRACKED", "INJECTED", "CRASHED"].includes(event.outcome) && event.attack) {
        const start = startByAttack.get(event.attack);
        if (start) {
          durations.push((event.timestamp - start) / 1000);
          startByAttack.delete(event.attack);
        }
      }
    });

  if (durations.length === 0) return 0;
  return Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;
};

const buildRiskGrade = ({ securityScore, successCount, compromisedCount }) => {
  let grade = "A";
  let color = [34, 197, 94];

  if (securityScore < 40 || successCount >= 4 || compromisedCount >= 3) {
    grade = "D";
    color = [239, 68, 68];
  } else if (securityScore < 55 || successCount >= 3 || compromisedCount >= 2) {
    grade = "C";
    color = [249, 115, 22];
  } else if (securityScore < 75 || successCount >= 2) {
    grade = "B";
    color = [245, 158, 11];
  }

  return { grade, color };
};

const summarizeHistoricalEvents = (historyEvents) => {
  const counts = new Map();

  historyEvents.forEach((event) => {
    const type = event.type || "UNKNOWN";
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
};

const drawScoreTrend = (doc, timeline, { x, y, width, height }) => {
  const points = timeline.length > 0 ? timeline : [{ score: 100 }];
  const maxX = Math.max(1, points.length - 1);

  doc.setDrawColor(38, 52, 85);
  doc.rect(x, y, width, height);

  // Horizontal guide lines
  [0.25, 0.5, 0.75].forEach((ratio) => {
    const gy = y + height * ratio;
    doc.setDrawColor(30, 45, 74);
    doc.line(x, gy, x + width, gy);
  });

  doc.setDrawColor(255, 91, 91);
  doc.setLineWidth(2);

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];

    const x1 = x + ((index - 1) / maxX) * width;
    const y1 = y + ((100 - (prev.score ?? 100)) / 100) * height;
    const x2 = x + (index / maxX) * width;
    const y2 = y + ((100 - (current.score ?? 100)) / 100) * height;

    doc.line(x1, y1, x2, y2);
  }
};

const buildTimelineRows = (sessionEvents) =>
  [...sessionEvents]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((event) => [
      formatDateTime(event.timestamp),
      event.attack || "-",
      event.targetLabel || event.targetId || "-",
      event.outcome || "-",
      event.details || "-",
    ]);

export const generateSessionReport = ({
  attacksCount,
  successCount,
  blockedCount,
  compromisedNodeIds,
  securityScore,
  sessionEvents,
  firewallEnabled,
  idsEnabled,
  historyEvents = [],
  securityScoreTimeline = [],
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const createdAt = Date.now();
  const compromisedList = compromisedNodeIds.length > 0 ? compromisedNodeIds.length : 0;
  const asciiDiagram = buildAsciiDiagram(compromisedNodeIds);
  const executive = buildExecutiveSummary({
    attacksCount,
    successCount,
    blockedCount,
    compromisedNodeIds,
    securityScore,
    sessionEvents,
  });
  const recommendations = buildRecommendations({
    compromisedNodeIds,
    blockedCount,
    firewallEnabled,
    idsEnabled,
    sessionEvents,
  });
  const attackBreakdown = buildAttackBreakdown(sessionEvents);
  const meanTimeToCompromise = calculateMeanTimeToCompromise(sessionEvents);
  const compromisedCount = compromisedNodeIds.length;
  const riskGrade = buildRiskGrade({ securityScore, successCount, compromisedCount });
  const historicalTopEvents = summarizeHistoricalEvents(historyEvents);

  doc.setFillColor(8, 12, 24);
  doc.rect(0, 0, 595, 842, "F");
  doc.setFont("courier", "bold");
  doc.setTextColor(251, 146, 60);
  doc.setFontSize(28);
  doc.text("SIEGE Security Assessment", 40, 70);
  doc.setFontSize(12);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${formatDateTime(createdAt)}`, 40, 100);
  doc.text(`Security Score: ${securityScore}%`, 40, 120);
  doc.text(`Compromised Nodes: ${compromisedList}`, 40, 140);
  doc.setDrawColor(30, 45, 74);
  doc.line(40, 155, 555, 155);
  doc.setFontSize(14);
  doc.setTextColor(224, 230, 240);
  doc.text("Initial Topology Snapshot", 40, 190);
  doc.setFont("courier", "normal");
  doc.setFontSize(13);
  doc.text(asciiDiagram, 60, 230);

  doc.addPage();
  doc.setFillColor(13, 18, 32);
  doc.rect(0, 0, 595, 842, "F");
  doc.setFont("courier", "bold");
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(22);
  doc.text("Executive Summary", 40, 60);
  doc.setFontSize(12);
  doc.setTextColor(224, 230, 240);
  doc.text(`Attack Sequences: ${attacksCount}`, 40, 100);
  doc.text(`Successful Outcomes: ${successCount}`, 40, 120);
  doc.text(`Blocked Outcomes: ${blockedCount}`, 40, 140);
  doc.text(`Firewall Enabled at Export: ${firewallEnabled ? "Yes" : "No"}`, 40, 160);
  doc.text(`IDS Enabled at Export: ${idsEnabled ? "Yes" : "No"}`, 40, 180);

  let summaryY = 220;
  executive.summary.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 500);
    doc.text(wrapped, 40, summaryY);
    summaryY += wrapped.length * 16 + 8;
  });

  if (executive.vulnerableNode) {
    doc.setTextColor(245, 158, 11);
    doc.text(
      `Most Vulnerable Node: ${executive.vulnerableNode.label} (${executive.vulnerableNode.count} attack interactions)`,
      40,
      summaryY + 10,
    );
  }

  doc.setTextColor(224, 230, 240);
  doc.text(`Mean Time To Compromise: ${meanTimeToCompromise > 0 ? `${meanTimeToCompromise}s` : "N/A"}`, 40, summaryY + 38);
  doc.text(`Risk Grade: ${riskGrade.grade}`, 40, summaryY + 58);

  doc.setTextColor(riskGrade.color[0], riskGrade.color[1], riskGrade.color[2]);
  doc.setFontSize(36);
  doc.text(riskGrade.grade, 500, summaryY + 62, { align: "center" });

  doc.addPage();
  doc.setFillColor(6, 9, 15);
  doc.rect(0, 0, 595, 842, "F");
  doc.setFont("courier", "bold");
  doc.setTextColor(96, 165, 250);
  doc.setFontSize(22);
  doc.text("Risk & Trend Analysis", 40, 60);

  doc.setTextColor(224, 230, 240);
  doc.setFont("courier", "normal");
  doc.setFontSize(11);
  doc.text(`Success Ratio: ${attacksCount > 0 ? Math.round((successCount / attacksCount) * 100) : 0}%`, 40, 95);
  doc.text(`Defense Efficiency: ${successCount + blockedCount > 0 ? Math.round((blockedCount / (successCount + blockedCount)) * 100) : 0}%`, 40, 113);
  doc.text(`Compromised Assets: ${compromisedCount}`, 40, 131);

  drawScoreTrend(doc, securityScoreTimeline, { x: 40, y: 160, width: 515, height: 140 });
  doc.setTextColor(148, 163, 184);
  doc.text("Security Score Trend", 40, 318);

  autoTable(doc, {
    startY: 340,
    head: [["Attack", "Events", "Successful", "Blocked"]],
    body: attackBreakdown.length
      ? attackBreakdown.map((entry) => [entry.attack, entry.events, entry.successes, entry.blocked])
      : [["No attack data", "-", "-", "-"]],
    theme: "grid",
    styles: {
      font: "courier",
      fontSize: 9,
      cellPadding: 6,
      textColor: [224, 230, 240],
      fillColor: [13, 18, 32],
      lineColor: [30, 45, 74],
    },
    headStyles: {
      fillColor: [30, 45, 74],
      textColor: [96, 165, 250],
      fontStyle: "bold",
    },
    margin: { left: 40, right: 40 },
  });

  doc.addPage();
  autoTable(doc, {
    startY: 85,
    head: [["Timestamp", "Attack", "Target", "Outcome", "Details"]],
    body: buildTimelineRows(sessionEvents),
    theme: "grid",
    styles: {
      font: "courier",
      fontSize: 8,
      cellPadding: 6,
      textColor: [224, 230, 240],
      fillColor: [13, 18, 32],
      lineColor: [30, 45, 74],
    },
    headStyles: {
      fillColor: [30, 45, 74],
      textColor: [251, 146, 60],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [10, 14, 26],
    },
    margin: { left: 24, right: 24, top: 85 },
    tableWidth: "auto",
    willDrawPage: () => {
      doc.setFillColor(6, 9, 15);
      doc.rect(0, 0, 595, 842, "F");
      doc.setFont("courier", "bold");
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(22);
      doc.text("Detailed Timeline", 40, 60);
    },
  });

  doc.addPage();
  doc.setFillColor(13, 18, 32);
  doc.rect(0, 0, 595, 842, "F");
  doc.setFont("courier", "bold");
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(22);
  doc.text("Recommendations", 40, 60);
  doc.setFont("courier", "normal");
  doc.setFontSize(12);
  doc.setTextColor(224, 230, 240);

  let recommendationY = 110;
  recommendations.forEach((recommendation, index) => {
    const wrapped = doc.splitTextToSize(`${index + 1}. [${recommendation.priority}] ${recommendation.text}`, 500);
    doc.text(wrapped, 40, recommendationY);
    recommendationY += wrapped.length * 18 + 18;
  });

  if (historicalTopEvents.length > 0) {
    autoTable(doc, {
      startY: Math.min(recommendationY + 8, 630),
      head: [["Historical Event Type", "Count"]],
      body: historicalTopEvents.map((row) => [row.type, row.count]),
      theme: "grid",
      styles: {
        font: "courier",
        fontSize: 9,
        cellPadding: 6,
        textColor: [224, 230, 240],
        fillColor: [13, 18, 32],
        lineColor: [30, 45, 74],
      },
      headStyles: {
        fillColor: [30, 45, 74],
        textColor: [251, 146, 60],
        fontStyle: "bold",
      },
      margin: { left: 40, right: 40 },
    });
  }

  const safeTimestamp = new Date(createdAt).toISOString().replace(/[:.]/g, "-");
  doc.save(`siege-session-report-${safeTimestamp}.pdf`);
};
