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
  const store = useSiegeStore();
  
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
      store.crackedNodeId !== null &&
      store.injectedNodeId !== null &&
      store.crashedNodeId !== null &&
      store.securityScore < 40
    );
  }, [store.crackedNodeId, store.injectedNodeId, store.crashedNodeId, store.securityScore]);

  // 2. Initialize sequence when authorized
  useEffect(() => {
    if (store.zeroDayPhase !== "authorized" || sequenceStartedRef.current) return;
    
    sequenceStartedRef.current = true;
    const timer = setTimeout(() => {
      store.setZeroDayPhase("executing");
      store.setZeroDayOverlayVisible(true);
      store.setZeroDayTintVisible(true);
      
      fetch(`${API_BASE_URL}/attack/zero-day`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      }).catch(() => store.addLog("ERROR", "Failed to initiate zero day payload", "danger"));
    }, 100);

    return () => clearTimeout(timer);
  }, [store.zeroDayPhase]);

  // 3. Cinematic Sequence (GSAP)
  useEffect(() => {
    if (store.zeroDayPhase !== "executing" || !store.zeroDayOverlayVisible || !zeroDayOverlayRef.current) return;
    if (zeroDaySequenceRef.current) return;

    const initialScore = store.securityScore;
    const scoreState = { value: initialScore };

    const timeline = gsap.timeline({
      onComplete: () => store.setZeroDayPhase("complete"),
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
        if (!store.zeroDayLogsInjected) {
          ZERO_DAY_LOGS.forEach((entry, index) => {
            timeline.call(() => {
              store.addLogEntry({
                timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
                tag: entry.tag,
                text: `${entry.text} ${entry.result}`,
                type: entry.type,
              });
            }, null, 3.6 + index * 0.1);
          });
          store.setZeroDayLogsInjected(true);
        }
      }, null, 3.55)
      .call(() => {
        store.setEdgeFlashColor("rgba(255, 0, 0, 0.9)");
        store.setEdgeFlashKey((prev) => prev + 1);
      }, null, 4.8)
      .call(() => {
        store.setZeroDayActive(true);
        store.markCompromisedNode("router");
        store.markCompromisedNode("firewall");
        store.markCompromisedNode("webserver");
        store.markCompromisedNode("database");
        store.markCompromisedNode("admin");
      }, null, 5.0)
      .to(scoreState, {
        value: 0,
        duration: 1.5,
        ease: "power4.out",
        onUpdate: () => store.setSecurityScore(Math.max(0, Math.round(scoreState.value))),
      }, 5.2)
      .to(zeroDayOverlayRef.current, { opacity: 0.4, duration: 0.5, ease: "power2.out" }, 5.5);

    return () => {
      // Keep playing sequence to completion once started.
    };
  }, [store.zeroDayPhase, store.zeroDayOverlayVisible]);

  const handleAuthorize = () => {
    if (store.zeroDayPhase !== null) return;
    store.incrementAttacksCount();
    store.addAttackHistory({ id: Date.now(), type: "zero-day", timestamp: Date.now(), startTime: Date.now(), success: false });
    store.setZeroDayPhase("authorized");
  };

  const handleResetSystem = () => {
    if (zeroDaySequenceRef.current) {
      zeroDaySequenceRef.current.kill();
      zeroDaySequenceRef.current = null;
    }

    const resetTimeline = gsap.timeline({
      onComplete: () => {
        store.resetAll();
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
    zeroDayPhase: store.zeroDayPhase,
    handleAuthorize,
    handleResetSystem,
    refs: {
      overlay: zeroDayOverlayRef,
      line: zeroDayLineRef,
      topText: zeroDayTopTextRef,
      bottomText: zeroDayBottomTextRef,
      disabled: zeroDayDisabledRef
    }
  };
}
