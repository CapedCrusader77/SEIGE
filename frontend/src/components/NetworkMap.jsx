/* UI overhaul: refreshed the map atmosphere with a new radar backdrop, always-traveling dashed links, and a CSS-driven sonar ring while keeping the live network/attack behavior intact. */
import { useCallback, useEffect, useRef, useState, memo } from "react";
import * as d3 from "d3";
import gsap from "gsap";
import { API_BASE_URL } from "../config";

const NODE_COLORS = {
  router: "#41ff9b",
  firewall: "#55c7ff",
  server: "#ff9b4a",
  database: "#c074ff",
  admin: "#ff5b5b",
};

const LINK_COLOR = "rgba(110, 136, 170, 0.35)";

const hexagonPath = (radius) => {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index - Math.PI / 6;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });

  return `M ${points.map((point) => point.join(",")).join(" L ")} Z`;
};

const NetworkMap = memo(function NetworkMap({
  scanningNodeId,
  bruteForceTarget,
  crackedNodeId,
  sqlInjectionTarget,
  injectedNodeId,
  ddosTarget,
  ddosStatus,
  crashedNodeId,
  firewallEnabled,
  lastAttackEvent,
  nodeHitCounts = {},
}) {
  const svgRef = useRef(null);
  const particlesRef = useRef(null);
  const nodeElementsRef = useRef(new Map());
  const [error, setError] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);

  const getHeatmapIntensity = useCallback(
    (nodeId) => {
      const hitCount = nodeHitCounts[nodeId] || 0;
      return Math.min(1, hitCount / 10);
    },
    [nodeHitCounts],
  );

  const getSafeNodePosition = (node) => {
    if (!node || typeof node.x !== "number" || typeof node.y !== "number") return null;
    return node;
  };

  const getNodeState = useCallback(
    (node) => {
      if (node.id === crashedNodeId) return "crashed";
      if (node.id === injectedNodeId || node.id === crackedNodeId) return "breached";
      if (node.id === sqlInjectionTarget || node.id === bruteForceTarget || node.id === scanningNodeId) return "targeted";
      if (node.id === ddosTarget) return "ddos-target";
      if (node.id === "firewall" && firewallEnabled) return "firewall-active";
      return "normal";
    },
    [bruteForceTarget, crackedNodeId, crashedNodeId, ddosTarget, firewallEnabled, injectedNodeId, scanningNodeId, sqlInjectionTarget],
  );

  useEffect(() => {
    fetch(`${API_BASE_URL}/network`)
      .then((res) => {
        if (!res.ok) throw new Error("Backend not reachable");
        return res.json();
      })
      .then((data) => {
        setNodes(data.nodes);
        setLinks(data.links);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return undefined;

    const width = 1100;
    const height = 820;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`).attr("class", "network-svg");
    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();
    nodeElementsRef.current.clear();

    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "node-glow");
    glow.append("feGaussianBlur").attr("stdDeviation", 7).attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    svg.append("g").attr("class", "links-layer");
    particlesRef.current = svg.append("g").attr("class", "particles-layer").node();
    svg.append("g").attr("class", "nodes-layer");
    svg.append("g").attr("class", "sonar-layer");
    svg.append("g").attr("class", "fx-layer");

    const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));

    const linkGroups = svg
      .select(".links-layer")
      .selectAll("g.link-group")
      .data(links)
      .enter()
      .append("g")
      .attr("class", "link-group");

    linkGroups
      .append("line")
      .attr("class", "link-base")
      .attr("x1", (link) => getSafeNodePosition(nodeById[link.source])?.x ?? 0)
      .attr("y1", (link) => getSafeNodePosition(nodeById[link.source])?.y ?? 0)
      .attr("x2", (link) => getSafeNodePosition(nodeById[link.target])?.x ?? 0)
      .attr("y2", (link) => getSafeNodePosition(nodeById[link.target])?.y ?? 0)
      .attr("stroke", LINK_COLOR)
      .attr("stroke-width", 1.35)
      .attr("stroke-dasharray", "6 4");

    linkGroups
      .append("line")
      .attr("class", "link-pulse")
      .attr("x1", (link) => getSafeNodePosition(nodeById[link.source])?.x ?? 0)
      .attr("y1", (link) => getSafeNodePosition(nodeById[link.source])?.y ?? 0)
      .attr("x2", (link) => getSafeNodePosition(nodeById[link.target])?.x ?? 0)
      .attr("y2", (link) => getSafeNodePosition(nodeById[link.target])?.y ?? 0)
      .attr("stroke", "rgba(255,255,255,0.72)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "6 4");

    const routerNode = nodes.find((node) => node.id === "router");
    if (routerNode) {
      svg
        .select(".sonar-layer")
        .append("circle")
        .attr("class", "sonar-ring")
        .attr("cx", routerNode.x)
        .attr("cy", routerNode.y)
        .attr("r", 26)
        .attr("fill", "none")
        .attr("stroke", "var(--green)")
        .attr("stroke-width", 1);
    }

    const drag = d3.drag().on("drag", function dragNode(event, node) {
      node.x = event.x;
      node.y = event.y;
      d3.select(this).attr("transform", `translate(${node.x}, ${node.y})`);

      svg
        .selectAll(".link-base, .link-pulse")
        .attr("x1", (link) => getSafeNodePosition(nodeById[link.source])?.x ?? 0)
        .attr("y1", (link) => getSafeNodePosition(nodeById[link.source])?.y ?? 0)
        .attr("x2", (link) => getSafeNodePosition(nodeById[link.target])?.x ?? 0)
        .attr("y2", (link) => getSafeNodePosition(nodeById[link.target])?.y ?? 0);

      const sonarRing = svg.select(".sonar-ring");
      if (!sonarRing.empty() && node.id === "router") {
        sonarRing.attr("cx", node.x).attr("cy", node.y);
      }
    });

    const nodeGroups = svg
      .select(".nodes-layer")
      .selectAll("g.node-group")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .attr("transform", (node) => `translate(${node.x}, ${node.y})`)
      .style("cursor", "none")
      .on("mouseenter", (event, node) => {
        setHoveredNode({ id: node.id, label: node.label, type: node.type, status: getNodeState(node), x: event.clientX, y: event.clientY });
        gsap.to(event.currentTarget, { scale: 1.2, duration: 0.3, ease: "power2.out", transformOrigin: "center center" });
      })
      .on("mousemove", (event, node) => {
        setHoveredNode({ id: node.id, label: node.label, type: node.type, status: getNodeState(node), x: event.clientX, y: event.clientY });
      })
      .on("mouseleave", (event) => {
        setHoveredNode(null);
        gsap.to(event.currentTarget, { scale: 1, duration: 0.35, ease: "power2.out", transformOrigin: "center center" });
      });

    nodeGroups.call(drag);
    nodeGroups.each(function registerNode(node) {
      nodeElementsRef.current.set(node.id, this);
    });

    nodeGroups.append("path").attr("class", "node-hex-glow").attr("d", hexagonPath(34)).attr("fill", (node) => NODE_COLORS[node.type] || "#ffffff").attr("opacity", 0.12).attr("filter", "url(#node-glow)");
    nodeGroups.append("path").attr("class", "node-hex").attr("d", hexagonPath(26)).attr("fill", "rgba(5, 10, 18, 0.92)").attr("stroke", (node) => NODE_COLORS[node.type] || "#ffffff").attr("stroke-width", 1.8);
    nodeGroups.append("circle").attr("class", "node-ring outer").attr("r", 16).attr("fill", "none").attr("stroke", (node) => NODE_COLORS[node.type] || "#ffffff").attr("stroke-width", 1.2).attr("stroke-opacity", 0.9).attr("stroke-dasharray", "20 12");
    nodeGroups.append("circle").attr("class", "node-ring inner").attr("r", 10).attr("fill", "none").attr("stroke", (node) => NODE_COLORS[node.type] || "#ffffff").attr("stroke-width", 1).attr("stroke-opacity", 0.55).attr("stroke-dasharray", "6 8");
    nodeGroups.append("circle").attr("class", "node-core").attr("r", 4.5).attr("fill", (node) => NODE_COLORS[node.type] || "#ffffff");
    nodeGroups.append("text").text((node) => node.label.toUpperCase()).attr("class", "node-label").attr("text-anchor", "middle").attr("y", 54);

    nodeGroups.each(function breathe() {
      gsap.to(this, { scale: 1.045, duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut" });
    });

    nodeGroups.selectAll(".node-ring.outer").each(function spin() {
      gsap.to(this, { rotation: 360, transformOrigin: "center center", duration: 8, repeat: -1, ease: "none" });
    });

    nodeGroups.selectAll(".node-ring.inner").each(function spinBack() {
      gsap.to(this, { rotation: -360, transformOrigin: "center center", duration: 5, repeat: -1, ease: "none" });
    });

    const nodeElements = nodeElementsRef.current;

    return () => {
      svg.selectAll("*").interrupt();
      nodeElements.forEach((element) => gsap.killTweensOf(element));
    };
  }, [getNodeState, nodes, links]);

  useEffect(() => {
    if (nodeElementsRef.current.size === 0) return;

    nodes.forEach((node) => {
      const element = nodeElementsRef.current.get(node.id);
      if (!element) return;

      const state = getNodeState(node);
      const baseColor = NODE_COLORS[node.type] || "#ffffff";
      const strokeColor =
        state === "crashed"
          ? "#596577"
          : state === "breached"
            ? "#ff5b5b"
            : state === "targeted"
              ? "#ffb141"
              : state === "ddos-target"
                ? "#ff7c52"
                : state === "firewall-active"
                  ? "#55c7ff"
                  : baseColor;

      const heatIntensity = getHeatmapIntensity(node.id);
      const heatColor = heatIntensity > 0 ? `rgba(255, 91, 91, ${0.3 + heatIntensity * 0.7})` : strokeColor;

      d3.select(element).select(".node-hex").attr("stroke", state !== "normal" ? strokeColor : heatColor);
      d3.select(element).select(".node-core").attr("fill", strokeColor);
      d3.select(element).selectAll(".node-ring").attr("stroke", strokeColor);

      const glowOpacity = state === "crashed" ? 0.04 : heatIntensity > 0 ? 0.16 + heatIntensity * 0.3 : 0.16;
      d3.select(element).select(".node-hex-glow").attr("fill", heatIntensity > 0.3 ? "#ff5b5b" : strokeColor).attr("opacity", glowOpacity);
      d3.select(element).select(".node-label").attr("fill", state === "crashed" ? "#64748b" : "#d3dfef");

      gsap.killTweensOf(element);
      if (state === "targeted" || state === "ddos-target") {
        gsap.to(element, {
          x: "+=7",
          duration: 0.07,
          repeat: 9,
          yoyo: true,
          ease: "sine.inOut",
          onComplete: () => gsap.set(element, { x: 0 }),
        });
      }

      d3.select(element).classed("node-breached", state === "breached");
      if (state === "breached") {
        gsap.fromTo(element, { scale: 0.9, opacity: 0.7 }, { scale: 1.05, opacity: 1, duration: 0.65, ease: "power3.out" });
      }
    });
  }, [getNodeState, getHeatmapIntensity, nodes, scanningNodeId, bruteForceTarget, crackedNodeId, sqlInjectionTarget, injectedNodeId, ddosTarget, ddosStatus, crashedNodeId, firewallEnabled, nodeHitCounts]);

  useEffect(() => {
    if (!lastAttackEvent || !svgRef.current || nodes.length === 0 || !particlesRef.current) return;

    const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
    const attacker = { x: 60, y: 90, id: "attacker" };
    const colors = {
      "port-scan": "#ffdd7a",
      "brute-force": "#ff5b5b",
      "sql-injection": "#c074ff",
      ddos: "#55c7ff",
    };

    const handleBlock = (position, group) => {
      d3.select(svgRef.current).select(".fx-layer").append("circle").attr("cx", position.x).attr("cy", position.y).attr("r", 8).attr("fill", "#ffffff").attr("opacity", 0.9).transition().duration(280).attr("r", 32).attr("opacity", 0).remove();
      group.remove();
    };

    const handleImpact = (type, position, group) => {
      group.remove();
      const fxLayer = d3.select(svgRef.current).select(".fx-layer");
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 26 + i * 3;
        fxLayer.append("circle").attr("cx", position.x).attr("cy", position.y).attr("r", 2).attr("fill", colors[type]).transition().duration(420).attr("cx", position.x + Math.cos(angle) * radius).attr("cy", position.y + Math.sin(angle) * radius).attr("opacity", 0).remove();
      }
    };

    const fireParticle = (type, targetId, delay = 0) => {
      const pathIds = ["router"];
      if (targetId !== "router") pathIds.push("firewall");
      if (targetId === "webserver") pathIds.push("webserver");
      else if (targetId === "database") pathIds.push("database");
      else if (targetId === "admin") pathIds.push("webserver", "admin");

      const path = [attacker, ...pathIds.map((nodeId) => getSafeNodePosition(nodeById[nodeId]))].filter(Boolean);
      if (path.length < 2) return;

      const group = d3.select(particlesRef.current).append("g").attr("class", "particle-group").style("opacity", 0);
      const particle = group.append("circle").attr("r", 4.5).attr("fill", colors[type]);
      group.append("circle").attr("r", 9).attr("fill", colors[type]).attr("opacity", 0.15);

      const animateSegment = (index) => {
        if (index >= path.length - 1) {
          handleImpact(type, path[path.length - 1], group);
          return;
        }

        const source = path[index];
        const target = path[index + 1];
        if (!source || !target) {
          group.remove();
          return;
        }

        if (firewallEnabled && source.id === "firewall" && targetId !== "firewall" && targetId !== "router") {
          handleBlock(source, group);
          return;
        }

        group
          .style("opacity", 1)
          .transition()
          .delay(delay)
          .duration(type === "ddos" ? 280 : 600)
          .ease(d3.easeLinear)
          .attrTween("transform", () => {
            const iX = d3.interpolate(source.x, target.x);
            const iY = d3.interpolate(source.y, target.y);
            return (t) => `translate(${iX(t)}, ${iY(t)})`;
          })
          .on("end", () => animateSegment(index + 1));

        particle.transition().delay(delay).duration(type === "ddos" ? 280 : 600).attr("r", type === "ddos" ? 3.4 : 4.5);
      };

      animateSegment(0);
    };

    if (lastAttackEvent.type === "ddos") {
      for (let i = 0; i < 5; i += 1) fireParticle("ddos", "webserver", i * 70);
    } else {
      fireParticle(lastAttackEvent.type, lastAttackEvent.targetId);
    }
  }, [lastAttackEvent, firewallEnabled, nodes]);

  if (error) {
    return (
      <div className="network-error">
        <div>
          <strong>CONNECTION ERROR</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="network-map-shell">
      <svg ref={svgRef} className="relative z-10 h-full w-full" />
      {hoveredNode ? (
        <div className="node-hover-card" style={{ left: hoveredNode.x + 18, top: hoveredNode.y + 18 }}>
          <span>{hoveredNode.label}</span>
          <strong>{hoveredNode.id.toUpperCase()}</strong>
          <em>{hoveredNode.type.toUpperCase()}</em>
          <small>Status: {hoveredNode.status.replaceAll("-", " ").toUpperCase()}</small>
        </div>
      ) : null}
    </div>
  );
});

export default NetworkMap;
