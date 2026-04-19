import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  }

  return (
    <div
      role="banner"
      aria-label="Install app"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#0a1830",
        border: "1px solid #4488cc",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 13,
        padding: "10px 20px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        zIndex: 200,
        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
      }}
    >
      <span>Install Fractured Alliance for offline play</span>
      <button
        type="button"
        onClick={() => void handleInstall()}
        aria-label="Install app"
        style={{
          background: "#1a3860",
          border: "1px solid #4488cc",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 12,
          padding: "4px 12px",
          cursor: "pointer",
        }}
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install prompt"
        style={{
          background: "transparent",
          border: "none",
          color: "#667",
          fontFamily: "monospace",
          fontSize: 14,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
