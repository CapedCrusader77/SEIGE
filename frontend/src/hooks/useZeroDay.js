import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import useSiegeStore from '../store/siegeStore';
import { ZERO_DAY_LOGS } from '../constants';
import { API_BASE_URL, CONTROL_API_HEADERS } from '../config';

/**
 * useZeroDay - Manages the state transitions and cinematic animations for the Zero Day exploit.
 * Monitors unlock conditions and executes the GSAP timeline.
 */
export default function useZeroDay() {
  const crackedNodeId = useSiegeStore((s) => s.crackedNodeId);
  const injectedNodeId = useSiegeStore((s) => s.injectedNodeId);
  const crashedNodeId = useSiegeStore((s) => s.crashedNodeId);
  const securityScore = useSiegeStore((s) => s.securityScore);
  const zeroDayPhase = useSiegeStore((s) => s.zeroDayPhase);
  const zeroDayOverlayVisible = useSiegeStore((s) => s.zeroDayOverlayVisible);
  const zeroDayLogsInjected = useSiegeStore((s) => s.zeroDayLogsInjected);

  const addLog = useSiegeStore((s) => s.addLog);
  const addLogEntry = useSiegeStore((s) => s.addLogEntry);
  const incrementAttacksCount = useSiegeStore((s) => s.incrementAttacksCount);
  const addAttackHistory = useSiegeStore((s) => s.addAttackHistory);
  const setZeroDayPhase = useSiegeStore((s) => s.setZeroDayPhase);
  const setZeroDayOverlayVisible = useSiegeStore((s) => s.setZeroDayOverlayVisible);
  const setZeroDayTintVisible = useSiegeStore((s) => s.setZeroDayTintVisible);
  const setZeroDayLogsInjected = useSiegeStore((s) => s.setZeroDayLogsInjected);
  const setEdgeFlashColor = useSiegeStore((s) => s.setEdgeFlashColor);
  const setEdgeFlashKey = useSiegeStore((s) => s.setEdgeFlashKey);
  const setZeroDayActive = useSiegeStore((s) => s.setZeroDayActive);
  const markCompromisedNode = useSiegeStore((s) => s.markCompromisedNode);
  const setSecurityScore = useSiegeStore((s) => s.setSecurityScore);
  const resetAll = useSiegeStore((s) => s.resetAll);
  
  // DOM Refs for animations
  const zeroDayOverlayRef = useRef(null);
  const zeroDayLineRef = useRef(null);
  const zeroDayTopTextRef = useRef(null);
  const zeroDayBottomTextRef = useRef(null);
  const zeroDayDisabledRef = useRef(null);
  const zeroDaySequenceRef = useRef(null);
  const sequenceStartedRef = useRef(false);

  // 1. Derived Unlock Condition
  const zeroDayUnlocked = useMemo(() => {
    return (
      crackedNodeId !== null &&
      injectedNodeId !== null &&
      crashedNodeId !== null &&
      securityScore < 40
    );
  }, [crackedNodeId, injectedNodeId, crashedNodeId, securityScore]);

  // 2. Initialize sequence when authorized
  useEffect(() => {
    if (zeroDayPhase !== "authorized" || sequenceStartedRef.current) return;
    
    sequenceStartedRef.current = true;
    const timer = setTimeout(() => {
      setZeroDayPhase("executing");
      setZeroDayOverlayVisible(true);
      setZeroDayTintVisible(true);
      
      fetch(`${API_BASE_URL}/attack/zero-day`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      }).catch(() => addLog("ERROR", "Failed to initiate zero day payload", "danger"));
    }, 100);

    return () => clearTimeout(timer);
  }, [zeroDayPhase, setZeroDayPhase, setZeroDayOverlayVisible, setZeroDayTintVisible, addLog]);

  // 3. Cinematic Sequence (GSAP)
  useEffect(() => {
    if (zeroDayPhase !== "executing" || !zeroDayOverlayVisible || !zeroDayOverlayRef.current) return;
    if (zeroDaySequenceRef.current) return;

    const initialScore = securityScore;
    const scoreState = { value: initialScore };

    const timeline = gsap.timeline({
      onComplete: () => setZeroDayPhase("complete"),
    });
    zeroDaySequenceRef.current = timeline;

    // Reset positions
    gsap.set(zeroDayOverlayRef.current, { opacity: 0 });
    gsap.set(zeroDayLineRef.current, { scaleX: 0, transformOrigin: "left center", opacity: 1 });
    gsap.set([zeroDayTopTextRef.current, zeroDayBottomTextRef.current, zeroDayDisabledRef.current], { opacity: 0 });

    timeline
      .to(zeroDayOverlayRef.current, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0)
      .to(zeroDayLineRef.current, { scaleX: 1, duration: 1.2, ease: "power2.inOut" }, 0.5)
      .set(zeroDayTopTextRef.current, { opacity: 1 }, 1.7)
      .to(zeroDayTopTextRef.current, { duration: 0.5, text: "EXECUTING CVE-2024-SIEGE", ease: "none" }, 1.7)
      .set(zeroDayBottomTextRef.current, { opacity: 1 }, 2.2)
      .to(zeroDayBottomTextRef.current, { duration: 0.45, text: "BYPASSING FIREWALL RULES...", ease: "none" }, 2.2)
      .to(zeroDayLineRef.current, { keyframes: [{ y: -8 }, { y: 8 }, { y: -5 }, { y: 5 }, { y: 0 }], duration: 0.28, ease: "power1.inOut" }, 2.8)
      .to(zeroDayDisabledRef.current, { opacity: 1, duration: 0.25, ease: "power2.out" }, 3.2)
      .call(() => {
        if (!zeroDayLogsInjected) {
          ZERO_DAY_LOGS.forEach((entry, index) => {
            timeline.call(() => {
              addLogEntry({
                timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
                tag: entry.tag,
                text: `${entry.text} ${entry.result}`,
                type: entry.type,
              });
            }, null, 3.6 + index * 0.1);
          });
          setZeroDayLogsInjected(true);
        }
      }, null, 3.55)
      .call(() => {
        setEdgeFlashColor("rgba(255, 0, 0, 0.9)");
        setEdgeFlashKey((prev) => prev + 1);
      }, null, 4.8)
      .call(() => {
        setZeroDayActive(true);
        markCompromisedNode("router");
        markCompromisedNode("firewall");
        markCompromisedNode("webserver");
        markCompromisedNode("database");
        markCompromisedNode("admin");
      }, null, 5.0)
      .to(scoreState, {
        value: 0,
        duration: 1.5,
        ease: "power4.out",
        onUpdate: () => setSecurityScore(Math.max(0, Math.round(scoreState.value))),
      }, 5.2)
      .to(zeroDayOverlayRef.current, { opacity: 0.4, duration: 0.5, ease: "power2.out" }, 5.5);

    return () => {
      // Keep playing sequence to completion once started.
    };
  }, [
    zeroDayPhase,
    zeroDayOverlayVisible,
    securityScore,
    setZeroDayPhase,
    zeroDayLogsInjected,
    addLogEntry,
    setZeroDayLogsInjected,
    setEdgeFlashColor,
    setEdgeFlashKey,
    setZeroDayActive,
    markCompromisedNode,
    setSecurityScore,
  ]);

  const handleAuthorize = () => {
    if (zeroDayPhase !== null) return;
    incrementAttacksCount();
    addAttackHistory({ id: Date.now(), type: "zero-day", timestamp: Date.now(), startTime: Date.now(), success: false });
    setZeroDayPhase("authorized");
  };

  const handleResetSystem = () => {
    if (zeroDaySequenceRef.current) {
      zeroDaySequenceRef.current.kill();
      zeroDaySequenceRef.current = null;
    }

    const resetTimeline = gsap.timeline({
      onComplete: () => {
        resetAll();
        sequenceStartedRef.current = false;
        gsap.set([zeroDayOverlayRef.current, zeroDayLineRef.current, zeroDayTopTextRef.current, zeroDayBottomTextRef.current, zeroDayDisabledRef.current], { clearProps: "all" });
      }
    });

    resetTimeline
      .to([zeroDayTopTextRef.current, zeroDayBottomTextRef.current, zeroDayDisabledRef.current], { opacity: 0, duration: 0.3 })
      .to(zeroDayLineRef.current, { scaleX: 0, duration: 0.5, ease: "power2.in" })
      .to(zeroDayOverlayRef.current, { opacity: 0, duration: 0.4 });
  };

  return {
    zeroDayUnlocked,
  zeroDayPhase,
    handleAuthorize,
    handleResetSystem,
    overlayRef: zeroDayOverlayRef,
    lineRef: zeroDayLineRef,
    topTextRef: zeroDayTopTextRef,
    bottomTextRef: zeroDayBottomTextRef,
    disabledRef: zeroDayDisabledRef,
  };
}
