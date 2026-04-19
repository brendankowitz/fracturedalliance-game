import { listSaveSlots } from "@fa/persistence";
import { useEffect, useState } from "react";
import { useUiStore } from "../store/uiStore.ts";

interface SaveSlot {
  slot: number;
  label: string;
  updatedAt: number;
}

interface SaveLoadPanelProps {
  onSave: (slot: number, label: string) => void;
  onLoad: (slot: number) => void;
}

export function SaveLoadPanel({ onSave, onLoad }: SaveLoadPanelProps) {
  const open = useUiStore((s) => s.saveLoadPanelOpen);
  const [slots, setSlots] = useState<SaveSlot[]>([]);

  useEffect(() => {
    if (open) void listSaveSlots().then(setSlots);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        background: "#06101e",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        padding: 24,
        minWidth: 320,
        zIndex: 20,
      }}
    >
      <h2 style={{ marginBottom: 12 }}>Save / Load</h2>
      {[0, 1, 2].map((slot) => {
        const saved = slots.find((s) => s.slot === slot);
        return (
          <div key={slot} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <span style={{ flex: 1 }}>
              Slot {slot + 1}: {saved ? saved.label : "— empty —"}
            </span>
            <button type="button" onClick={() => onSave(slot, `Save ${slot + 1}`)}>
              Save
            </button>
            {saved && (
              <button type="button" onClick={() => onLoad(slot)}>
                Load
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
