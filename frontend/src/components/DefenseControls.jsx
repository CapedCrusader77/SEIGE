import { memo } from "react";
import useSiegeStore from "../store/siegeStore";
import useAttackHandlers from "../hooks/useAttackHandlers";

const DefenseControls = memo(function DefenseControls() {
  const firewallEnabled = useSiegeStore(s => s.firewallEnabled);
  const idsEnabled = useSiegeStore(s => s.idsEnabled);
  const { toggleDefense } = useAttackHandlers();

  return (
    <div className="defense-controls-panel command-subpanel">
      <div className="panel-header compact defense-panel-header">
        <div>
          <span className="eyebrow">Defense Layer</span>
          <h3 className="defense-title">DEFENSE SYSTEMS</h3>
        </div>
      </div>
      <div className="defense-toggle-row defense-toggle-grid">
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
