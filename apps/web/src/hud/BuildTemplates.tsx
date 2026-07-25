import { useState } from "react";
import { useUiStore } from "../store/uiStore.ts";

interface BuildTemplatesProps {
  currentQueue: string[];
  onApplyTemplate: (buildings: string[]) => void;
}

export function BuildTemplates({ currentQueue, onApplyTemplate }: BuildTemplatesProps) {
  const buildTemplates = useUiStore((s) => s.buildTemplates);
  const saveBuildTemplate = useUiStore((s) => s.saveBuildTemplate);
  const deleteBuildTemplate = useUiStore((s) => s.deleteBuildTemplate);
  const [showSave, setShowSave] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const handleSave = () => {
    const name = templateName.trim();
    if (!name || currentQueue.length === 0) return;
    saveBuildTemplate(name, currentQueue);
    setTemplateName("");
    setShowSave(false);
  };

  return (
    <div style={{ borderTop: "1px solid #224", paddingTop: 8, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <button
          type="button"
          onClick={() => setShowSave((v) => !v)}
          style={{
            background: "#0a1830",
            border: "1px solid #335",
            color: "#7890b0",
            fontFamily: "monospace",
            fontSize: 10,
            padding: "2px 6px",
            cursor: "pointer",
          }}
        >
          Save as Template
        </button>
      </div>

      {showSave && (
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          <input
            type="text"
            placeholder="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            style={{
              flex: 1,
              background: "#060f20",
              border: "1px solid #335",
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 10,
              padding: "2px 5px",
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            style={{
              background: "#1a3860",
              border: "1px solid #4488cc",
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 10,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      )}

      {Object.keys(buildTemplates).length > 0 && (
        <div>
          <span style={{ fontSize: 10, color: "#667" }}>Load template: </span>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onApplyTemplate(buildTemplates[e.target.value] ?? []);
                e.target.value = "";
              }
            }}
            defaultValue=""
            style={{
              background: "#060f20",
              border: "1px solid #335",
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 10,
              padding: "1px 4px",
              marginLeft: 4,
            }}
          >
            <option value="">-- select --</option>
            {Object.keys(buildTemplates).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {Object.keys(buildTemplates).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => deleteBuildTemplate(name)}
                title={`Delete template: ${name}`}
                style={{
                  background: "none",
                  border: "1px solid #224",
                  color: "#446",
                  fontFamily: "monospace",
                  fontSize: 9,
                  padding: "1px 4px",
                  cursor: "pointer",
                }}
              >
                ✕ {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
