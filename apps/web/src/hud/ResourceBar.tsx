interface ResourceBarProps {
  credits: number;
  federationStanding: number;
  tick: number;
}

export function ResourceBar({ credits, federationStanding, tick }: ResourceBarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        gap: 24,
        padding: "8px 16px",
        background: "rgba(0,8,20,0.85)",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 14,
        zIndex: 10,
      }}
    >
      <span>
        Credits: <strong>{credits.toLocaleString()}</strong>
      </span>
      <span>
        Standing: <strong>{federationStanding}</strong>
      </span>
      <span style={{ marginLeft: "auto" }}>Tick {tick}</span>
    </div>
  );
}
