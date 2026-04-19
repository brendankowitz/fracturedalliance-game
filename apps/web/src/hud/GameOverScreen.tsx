export function GameOverScreen() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 8, 24, 0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "monospace",
        color: "#c8d8ff",
      }}
    >
      <div style={{ fontSize: 36, fontWeight: "bold", color: "#f44", marginBottom: 12 }}>
        DEFEAT
      </div>
      <div style={{ fontSize: 18, color: "#a88", marginBottom: 32 }}>Colony Lost</div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: "#0a1830",
          border: "1px solid #f44",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 14,
          padding: "8px 24px",
          cursor: "pointer",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
