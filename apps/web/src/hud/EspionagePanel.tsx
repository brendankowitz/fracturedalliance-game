import type { AgentMissionKind } from "@fa/domain";
import { agentId, asteroidId } from "@fa/domain";
import type { AgentSnapshot, Command, HudSnapshot } from "@fa/sim";
import { isV2Snapshot } from "@fa/sim-adapter";
import { useState } from "react";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { HelpTip } from "./HelpTip.tsx";

const MISSION_LABELS: Record<AgentMissionKind, string> = {
  recon: "Recon",
  techSteal: "Tech Steal",
  sabotage: "Sabotage",
  blackmail: "Blackmail",
  liberate: "Liberate",
};

const ALL_MISSIONS: AgentMissionKind[] = [
  "recon",
  "techSteal",
  "sabotage",
  "blackmail",
  "liberate",
];

interface Props {
  onCommand: (cmd: Command) => void;
}

function AgentRow({
  agent,
  snapshot,
  onCommand,
  perMissionHire,
}: {
  agent: AgentSnapshot;
  snapshot: HudSnapshot;
  onCommand: (cmd: Command) => void;
  /** V2 (adopted sim): agents are paid per mission — no standing hire step. */
  perMissionHire: boolean;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  // Dispatch needs a target player, so only owned rival colonies qualify.
  const targetAsteroids = snapshot.asteroids.filter(
    (a) => a.ownerId !== snapshot.humanPlayerId && (!perMissionHire || a.ownerId !== null),
  );

  if (!agent.owned && !perMissionHire) {
    return (
      <div
        style={{
          marginBottom: 8,
          padding: "6px 8px",
          border: "1px solid #224",
          background: "#060e20",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: "bold" }}>{agent.name}</span>
            <span style={{ fontSize: 11, color: "#7090b0", marginLeft: 8 }}>
              Stealth {agent.stealth}
            </span>
          </div>
          <button
            type="button"
            disabled={snapshot.credits < agent.hireCost}
            onClick={() => onCommand({ kind: "hireAgent", agentId: agentId(agent.id) })}
            style={{
              background: snapshot.credits >= agent.hireCost ? "#1a3060" : "#111",
              border: "1px solid #224",
              color: snapshot.credits >= agent.hireCost ? "#c8d8ff" : "#446",
              fontFamily: "monospace",
              fontSize: 11,
              padding: "2px 8px",
              cursor: snapshot.credits >= agent.hireCost ? "pointer" : "not-allowed",
            }}
          >
            Hire ₡{agent.hireCost.toLocaleString()}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: 8,
        padding: "6px 8px",
        border: "1px solid #336",
        background: "#060e20",
      }}
    >
      <div style={{ fontWeight: "bold", color: "#8af" }}>
        {agent.name}
        <span style={{ fontSize: 11, color: "#7090b0", fontWeight: "normal", marginLeft: 8 }}>
          Skill {agent.stealth}
        </span>
        {perMissionHire && (
          <span style={{ fontSize: 10, color: "#668", fontWeight: "normal", marginLeft: 8 }}>
            ₡{agent.hireCost.toLocaleString()}/mission
          </span>
        )}
      </div>
      {agent.missionKind !== null ? (
        <div style={{ fontSize: 11, color: "#4d8", marginTop: 2 }}>
          Mission: {MISSION_LABELS[agent.missionKind]} → done tick {agent.missionCompleteTick}
        </div>
      ) : (
        <div style={{ marginTop: 4 }}>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            style={{
              background: "#0a1830",
              border: "1px solid #224",
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 11,
              padding: "2px 4px",
              marginBottom: 4,
              width: "100%",
            }}
          >
            <option value="">Select target asteroid…</option>
            {targetAsteroids.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {selectedTarget && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ALL_MISSIONS.map((mk) => (
                <button
                  key={mk}
                  type="button"
                  onClick={() =>
                    onCommand({
                      kind: "assignMission",
                      agentId: agentId(agent.id),
                      missionKind: mk,
                      targetAsteroidId: asteroidId(selectedTarget),
                    })
                  }
                  style={{
                    background: "#1a2840",
                    border: "1px solid #449",
                    color: "#c8d8ff",
                    fontFamily: "monospace",
                    fontSize: 10,
                    padding: "2px 6px",
                    cursor: "pointer",
                  }}
                >
                  {MISSION_LABELS[mk]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EspionagePanel({ onCommand }: Props) {
  const open = useUiStore((s) => s.espionagePanelOpen);
  const snapshot = useGameStore((s) => s.snapshot);

  if (!open || !snapshot) return null;

  const perMissionHire = isV2Snapshot(snapshot);
  const ownedAgents = perMissionHire
    ? snapshot.agents.filter((a) => a.missionKind !== null)
    : snapshot.agents.filter((a) => a.owned);
  const availableAgents = perMissionHire
    ? snapshot.agents.filter((a) => a.missionKind === null)
    : snapshot.agents.filter((a) => !a.owned);

  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        right: 360,
        width: 300,
        maxHeight: "75vh",
        overflowY: "auto",
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 13,
        zIndex: 20,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>
        Espionage
        <HelpTip text="Deploy agents on espionage missions to steal tech, sabotage enemies, or gather intel." />
      </div>
      {ownedAgents.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#7090b0", marginBottom: 4 }}>
            {perMissionHire ? "ON MISSION" : "YOUR AGENTS"} ({ownedAgents.length})
          </div>
          {ownedAgents.map((a) => (
            <AgentRow
              key={a.id}
              agent={a}
              snapshot={snapshot}
              onCommand={onCommand}
              perMissionHire={perMissionHire}
            />
          ))}
        </div>
      )}
      {availableAgents.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#7090b0", marginBottom: 4 }}>
            {perMissionHire ? "OPERATIVES — PAID PER MISSION" : "AVAILABLE FOR HIRE"} (
            {availableAgents.length})
          </div>
          {availableAgents.map((a) => (
            <AgentRow
              key={a.id}
              agent={a}
              snapshot={snapshot}
              onCommand={onCommand}
              perMissionHire={perMissionHire}
            />
          ))}
        </div>
      )}
      {ownedAgents.length === 0 && availableAgents.length === 0 && (
        <div style={{ color: "#446" }}>No agents available</div>
      )}
    </div>
  );
}
