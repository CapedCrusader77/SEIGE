/* UI rollback: restored the earlier hero composition with the bottom-left command copy while keeping the current props and particle background. */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ParticleField from "./ParticleField";

export default function HeroSection({ onScrollDown, isScanning }) {
  const subtitleRef = useRef(null);
  const subtitleWordsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const words = subtitleRef.current?.textContent.split(" ") || [];
      if (subtitleRef.current && words.length > 0) {
        subtitleRef.current.innerHTML = words
          .map((word, index) => `<span style="display:inline-block;opacity:0" data-index="${index}">${word}</span>`)
          .join(" ");

        subtitleWordsRef.current = Array.from(subtitleRef.current.querySelectorAll("span"));
        subtitleWordsRef.current.forEach((word, index) => {
          gsap.fromTo(
            word,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.55, delay: 0.55 + index * 0.1, ease: "power3.out" },
          );
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero-section">
      <div className="hero-particles">
        <ParticleField />
      </div>
      <div className="hero-scanline" />
      <div className="hero-noise" />

      <div className="hero-ghost-text">SIEGE</div>

      <div className="hero-sweep-line sweep-1" />
      <div className="hero-sweep-line sweep-2" />
      <div className="hero-sweep-line sweep-3" />

      <div className="hero-rec-indicator">
        <span className="rec-dot" />
        <span className="rec-text">REC</span>
      </div>

      <div className="hero-copy">
        <div className="eyebrow">Cinematic Cyberwar Interface</div>
        <h1>SIEGE</h1>
        <p ref={subtitleRef} className="hero-subtitle">
          INITIALIZING NETWORK...
        </p>
        <div className="hero-meta-row">
          <div className="hero-meta-card">
            <span>Mode</span>
            <strong>{isScanning ? "ACTIVE ENGAGEMENT" : "RECON STANDBY"}</strong>
          </div>
          <div className="hero-meta-card">
            <span>Runtime</span>
            <strong>REAL-TIME WEBSOCKET FEED</strong>
          </div>
        </div>
      </div>

      <button type="button" className="scroll-cue" onClick={onScrollDown} aria-label="Scroll to dashboard">
        <span />
        <em>Scroll to engage</em>
      </button>
    </section>
  );
}
