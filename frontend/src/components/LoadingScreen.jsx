/* UI rollback: restored the earlier bracket-and-scramble loading sequence while keeping the same loader mount/unmount behavior. */
import { useEffect, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import useSiegeStore from "../store/siegeStore";
gsap.registerPlugin(TextPlugin);

const FINAL_TITLE = "SIEGE";
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

const scrambleTitle = (progress) => {
  const resolved = Math.floor(progress * FINAL_TITLE.length);
  return FINAL_TITLE
    .split("")
    .map((char, index) => (index < resolved ? char : CHARSET[Math.floor(Math.random() * CHARSET.length)]))
    .join("");
};

export default function LoadingScreen() {
  const hideLoader = useSiegeStore((s) => s.hideLoader);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const barRef = useRef(null);
  const flashRef = useRef(null);
  const bracketsRef = useRef([]);
  const statsRef = useRef(null);
  const [displayTitle, setDisplayTitle] = useState(scrambleTitle(0));
  const [stats, setStats] = useState({ nodes: 5, protocols: 3, vectors: 12 });

  useEffect(() => {
    const state = { progress: 0, nodes: 0, protocols: 0, vectors: 0 };
    const timeline = gsap.timeline();

    const brackets = [
      { delay: 0.2, x: -80, y: -80 },
      { delay: 0.25, x: 80, y: -80 },
      { delay: 0.3, x: -80, y: 80 },
      { delay: 0.35, x: 80, y: 80 },
    ];

    brackets.forEach((bracket, index) => {
      const element = bracketsRef.current[index];
      if (!element) return;
      gsap.fromTo(
        element,
        { opacity: 0, x: bracket.x, y: bracket.y },
        { opacity: 1, x: 0, y: 0, duration: 0.6, delay: bracket.delay, ease: "power3.out" },
      );
    });

    timeline
      .to(state, {
        progress: 1,
        duration: 1.4,
        ease: "none",
        onUpdate: () => setDisplayTitle(scrambleTitle(state.progress)),
      })
      .to(
        barRef.current,
        {
          scaleX: 1,
          duration: 2.2,
          ease: "power3.out",
        },
        0,
      )
      .to(
        subtitleRef.current,
        {
          duration: 0.9,
          text: "CYBER SIMULATION PLATFORM",
          ease: "none",
        },
        1.15,
      )
      .to(
        titleRef.current,
        {
          letterSpacing: "0.42em",
          textShadow: "0 0 35px rgba(255, 119, 45, 0.45)",
          duration: 0.65,
          ease: "power2.out",
        },
        1.4,
      )
      .to(
        flashRef.current,
        {
          opacity: [0, 1, 0],
          duration: 0.08,
          ease: "power2.inOut",
        },
        2.8,
      )
      .to(
        statsRef.current,
        {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
        2.85,
      );

    gsap.to(state, {
      nodes: 5,
      duration: 0.6,
      delay: 2.85,
      ease: "none",
      onUpdate: () => setStats((prev) => ({ ...prev, nodes: Math.floor(state.nodes) })),
    });

    gsap.to(state, {
      protocols: 3,
      duration: 0.5,
      delay: 3.05,
      ease: "none",
      onUpdate: () => setStats((prev) => ({ ...prev, protocols: Math.floor(state.protocols) })),
    });

    gsap.to(state, {
      vectors: 12,
      duration: 0.7,
      delay: 3.3,
      ease: "none",
      onUpdate: () => setStats((prev) => ({ ...prev, vectors: Math.floor(state.vectors) })),
      onComplete: () => {
        setTimeout(hideLoader, 800);
      }
    });

    return () => timeline.kill();
  }, [hideLoader]);

  return (
    <Motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="loading-brackets">
        <div ref={(element) => (bracketsRef.current[0] = element)} className="bracket corner-tl">
          ┌
        </div>
        <div ref={(element) => (bracketsRef.current[1] = element)} className="bracket corner-tr">
          ┐
        </div>
        <div ref={(element) => (bracketsRef.current[2] = element)} className="bracket corner-bl">
          └
        </div>
        <div ref={(element) => (bracketsRef.current[3] = element)} className="bracket corner-br">
          ┘
        </div>
      </div>

      <div ref={flashRef} className="loading-flash" />

      <div className="loading-inner">
        <div className="loading-kicker">boot sequence</div>
        <div ref={titleRef} className="loading-title">
          {displayTitle}
        </div>
        <div className="loading-bar-shell">
          <div ref={barRef} className="loading-bar-fill" />
        </div>
        <div ref={subtitleRef} className="loading-subtitle" />
        <div ref={statsRef} className="loading-stats">
          <span>NODES: {stats.nodes}</span>
          <span className="stats-divider">|</span>
          <span>PROTOCOLS: {stats.protocols}</span>
          <span className="stats-divider">|</span>
          <span>VECTORS: {stats.vectors}</span>
        </div>
      </div>
    </Motion.div>
  );
}
