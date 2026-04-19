import { useGameStore } from "../store/gameStore.ts";
import { BuildingPanel } from "./BuildingPanel.tsx";
import { ResourceBar } from "./ResourceBar.tsx";

export function HUD() {
  const snapshot = useGameStore((s) => s.snapshot);

  if (!snapshot) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#c8d8ff",
          fontFamily: "monospace",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <>
      <ResourceBar
        credits={snapshot.credits}
        federationStanding={snapshot.federationStanding}
        tick={snapshot.tick}
      />
      <BuildingPanel />
    </>
  );
}
