import { useState } from "react";
import { useUiStore } from "../store/uiStore.ts";

interface HelpTipProps {
  text: string;
}

export function HelpTip({ text }: HelpTipProps) {
  const showHelp = useUiStore((s) => s.showHelp);
  const [visible, setVisible] = useState(false);

  if (!showHelp) return null;

  return (
    <span style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#1a2840",
          color: "#7890b0",
          border: "1px solid #335",
          fontSize: 9,
          fontWeight: 700,
          cursor: "pointer",
          marginLeft: 5,
          lineHeight: 1,
        }}
        aria-label="Help"
      >
        ?
      </button>
      {visible && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0a1830",
            border: "1px solid #335",
            color: "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 11,
            padding: "6px 8px",
            zIndex: 200,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
