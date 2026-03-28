import { useState, useEffect } from 'react';

const formatSessionClock = (elapsedMs) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

/**
 * useSessionTimer - Hook to provide a human-readable session clock.
 * Counts up from the moment the application is loaded.
 */
export default function useSessionTimer(startTime) {
  const [sessionTime, setSessionTime] = useState("00:00:00");

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setSessionTime(formatSessionClock(elapsed));
    }, 500);

    return () => clearInterval(timer);
  }, [startTime]);

  return { sessionTime };
}
