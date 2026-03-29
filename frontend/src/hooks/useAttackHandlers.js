import useSiegeStore from '../store/siegeStore';
import { API_BASE_URL, CONTROL_API_HEADERS } from '../config';
import { ATTACK_STYLES } from '../constants';

/**
 * useAttackHandlers - Hook to centralize attack triggering logic.
 * Communicates with the FastAPI backend and updates the store.
 */
export default function useAttackHandlers() {
  const store = useSiegeStore();

  const handleLaunchAttack = async (type) => {
    if (store.isScanning) return;

    // Reset specific breach states before starting new attack
    if (type === "brute-force") store.crackNode(null);
    if (type === "sql-injection") {
      store.injectNode(null);
      store.crashNode(null);
    }
    if (type === "ddos") store.crashNode(null);

    store.triggerEdgeFlash(ATTACK_STYLES[type]?.flash || "rgba(255,0,0,0.2)");
    
    try {
      await fetch(`${API_BASE_URL}/attack/${type}`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      });
    } catch {
      store.addLog("ERROR", `Failed to connect to backend: ${type}`, "danger");
    }
  };

  const handleLaunchAttackChain = async () => {
    if (store.isScanning || store.attackChainActive) return;
    
    store.crackNode(null);
    store.injectNode(null);
    store.crashNode(null);
    store.triggerEdgeFlash("rgba(255, 0, 0, 0.4)");

    try {
      await fetch(`${API_BASE_URL}/attack/chain`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      });
    } catch {
      store.addLog("ERROR", "Failed to initiate attack chain", "danger");
    }
  };

  const toggleDefense = async (type) => {
    try {
      const response = await fetch(`${API_BASE_URL}/defense/${type}/toggle`, {
        method: "POST",
        headers: CONTROL_API_HEADERS,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (err) {
      console.error(`Defense toggle ${type} failed:`, err);
      store.addLog("ERROR", `Defense toggle failed: ${type}`, "danger");
    }
  };

  return {
    handleLaunchAttack,
    handleLaunchAttackChain,
    toggleDefense
  };
}
