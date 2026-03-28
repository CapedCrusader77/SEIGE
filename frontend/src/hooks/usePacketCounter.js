import { useState, useEffect } from 'react';

/**
 * usePacketCounter - Hook to provide a fake "packets intercepted" counter.
 * Randomly increments every 600-900ms to simulate network traffic.
 */
export default function usePacketCounter() {
  const [packetsIntercepted, setPacketsIntercepted] = useState(0);

  useEffect(() => {
    const packetTimer = setInterval(() => {
      const newPackets = Math.floor(Math.random() * 4) + 1;
      setPacketsIntercepted((prev) => prev + newPackets);
    }, 750); // Average of 600-900ms

    return () => clearInterval(packetTimer);
  }, []);

  return { packetsIntercepted };
}
