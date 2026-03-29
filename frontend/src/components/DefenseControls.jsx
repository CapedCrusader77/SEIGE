import { memo } from "react";
import useSiegeStore from "../store/siegeStore";
import useAttackHandlers from "../hooks/useAttackHandlers";

const DefenseControls = memo(function DefenseControls() {
  const firewallEnabled = useSiegeStore(s => s.firewallEnabled);
  const idsEnabled = useSiegeStore(s => s.idsEnabled);
  const { toggleDefense } = useAttackHandlers();

  return (
    <div className="defense-controls-panel panel-frame">
      <div className="panel-header compact" style={{ paddingBottom: "1rem" }}>
        <div>
          <span className="eyebrow">Controls</span>
          <h3 style={{ fontSize: "1rem" }}>DEFENSE SYSTEMS</h3>
        </div>
      </div>
      <div className="defense-toggle-row" style={{ marginTop: 0 }}>
        <button 
          type="button" 
          className={`defense-toggle ${firewallEnabled ? "active" : ""}`} 
          onClick={() => toggleDefense("firewall")}
        >
          <span>Firewall</span>
          <strong>{firewallEnabled ? "ACTIVE" : "INACTIVE"}</strong>
        </button>
        <button 
          type="button" 
          className={`defense-toggle ${idsEnabled ? "active" : ""}`} 
          onClick={() => toggleDefense("ids")}
        >
          <span>IDS</span>
          <strong>{idsEnabled ? "RUNNING" : "STOPPED"}</strong>
        </button>
      </div>
    </div>
  );
});

export default DefenseControls;
