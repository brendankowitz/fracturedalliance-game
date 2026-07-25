import { getRaceDef } from "@fa/content";
import type { TreatyKind } from "@fa/domain";
import type { Command, DiplomacyEntry, HudSnapshot } from "@fa/sim";
import type { HudSnapshotV2 } from "@fa/sim-adapter";
import { isV2Snapshot, RACE_LABELS } from "@fa/sim-adapter";
import { assetUrl } from "../assetUrl.ts";
import { useUiStore } from "../store/uiStore.ts";
import { HelpTip } from "./HelpTip.tsx";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TREATY_LABELS: Record<TreatyKind, string> = {
  nonAggression: "Non-Aggression",
  peace: "Peace Treaty",
  trade: "Trade Agreement",
  noCovert: "No-Covert Pact",
  openBorders: "Open Borders",
  defensivePact: "Defensive Pact",
  jointWar: "Joint War",
};

const ALL_PROPOSABLE: ReadonlyArray<TreatyKind> = [
  "nonAggression",
  "peace",
  "trade",
  "noCovert",
  "openBorders",
  "defensivePact",
  "jointWar",
];

function repColor(reputation: number): string {
  if (reputation >= 20) return "var(--green)";
  if (reputation <= -20) return "var(--red)";
  return "var(--amber)";
}

function repBarColor(reputation: number): string {
  if (reputation >= 20) return "var(--green)";
  if (reputation <= -20) return "var(--red)";
  return "var(--amber)";
}

function repBorderColor(reputation: number): string {
  if (reputation >= 20) return "2px solid var(--green)";
  if (reputation <= -20) return "2px solid var(--red)";
  return "2px solid var(--amber)";
}

const PORTRAIT_SETS = ["civpro", "matreKhan", "terran"] as const;

function getPortrait(raceId: string, reputation: number): string {
  const set = PORTRAIT_SETS[Math.abs(hashStr(raceId)) % 3];
  const mood = reputation <= -10 ? "hostile" : "neutral";
  return assetUrl(`/assets/portraits/${set}-${mood}.png`);
}

function repSign(reputation: number): string {
  return reputation > 0 ? `+${reputation}` : `${reputation}`;
}

function DiplomacyRow({
  entry,
  onCommand,
}: {
  entry: DiplomacyEntry;
  onCommand: (cmd: Command) => void;
}) {
  const raceDef = getRaceDef(entry.raceId);
  const raceName = RACE_LABELS[entry.raceId] ?? raceDef?.name ?? entry.raceId;
  const activeKinds = new Set(entry.activeTreaties.map((t) => t.kind));

  const portraitImg = getPortrait(entry.raceId, entry.reputation);

  // Map reputation -100..+100 to 0..100%
  const barPct = Math.round(((entry.reputation + 100) / 200) * 100);

  return (
    <div
      style={{
        marginBottom: 2,
        borderBottom: "1px solid var(--border)",
        paddingBottom: 10,
        paddingTop: 10,
      }}
    >
      {/* Header row: planet + names + rep label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <img
          src={portraitImg}
          alt={raceName}
          width={40}
          height={40}
          style={{
            borderRadius: "50%",
            border: repBorderColor(entry.reputation),
            flexShrink: 0,
            objectFit: "cover",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: 12,
              color: "var(--text-hi)",
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {raceName}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-lo)",
              marginTop: 2,
            }}
          >
            {raceName}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 11,
            color: repColor(entry.reputation),
            flexShrink: 0,
            letterSpacing: 0.5,
          }}
        >
          REP {repSign(entry.reputation)}
        </div>
      </div>

      {/* Reputation bar */}
      <div
        style={{
          height: 4,
          background: "var(--bg-input)",
          borderRadius: 2,
          marginBottom: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${barPct}%`,
            background: repBarColor(entry.reputation),
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Grudge score */}
      {entry.grudgeScore > 0 && (
        <div
          style={{
            fontSize: 10,
            color: "var(--red)",
            fontFamily: "var(--font-data)",
            marginBottom: 6,
            letterSpacing: 0.5,
          }}
        >
          GRUDGE {entry.grudgeScore}
        </div>
      )}

      {/* Active treaties — breakable, with visible expiry */}
      {entry.activeTreaties.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {entry.activeTreaties.map((t) => (
            <span
              key={t.kind}
              style={{
                fontSize: 10,
                color: "var(--green)",
                background: "rgba(0,204,102,0.12)",
                border: "1px solid var(--green)",
                padding: "2px 6px",
                borderRadius: 2,
                fontFamily: "var(--font-data)",
                letterSpacing: 0.3,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title={t.expiresTick !== null ? `Expires T${t.expiresTick}` : "Permanent"}
            >
              ✓ {TREATY_LABELS[t.kind]}
              <button
                type="button"
                aria-label={`Break ${TREATY_LABELS[t.kind]}`}
                title="Break treaty — costs reputation"
                onClick={() =>
                  onCommand({
                    kind: "breakTreaty",
                    targetPlayerId: entry.playerId,
                    treatyKind: t.kind,
                  })
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--red)",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Treaty proposal buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {ALL_PROPOSABLE.filter((k) => !activeKinds.has(k)).map((k) => (
          <button
            key={k}
            type="button"
            className="fa-btn"
            onClick={() =>
              onCommand({ kind: "proposeTreaty", targetPlayerId: entry.playerId, treatyKind: k })
            }
            style={{ fontSize: 10, padding: "2px 7px" }}
          >
            + {TREATY_LABELS[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  snapshot: HudSnapshot;
  onCommand: (cmd: Command) => void;
}

function CouncilSection({
  snapshot,
  onCommand,
}: {
  snapshot: HudSnapshotV2;
  onCommand: (cmd: Command) => void;
}) {
  const { embargoes, tariffs, openVotes } = snapshot.council;
  if (embargoes.length === 0 && tariffs.length === 0 && openVotes.length === 0) return null;

  return (
    <div
      style={{
        padding: "8px 14px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        fontFamily: "var(--font-data)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--amber)", letterSpacing: 1.5, marginBottom: 6 }}>
        FEDERAL COUNCIL
      </div>
      {embargoes.map((e) => (
        <div key={`${e.target}-${e.expiresTick}`} style={{ fontSize: 11, color: "var(--red)" }}>
          ⛔ Embargo on {RACE_LABELS[e.target] ?? e.target} — until T{e.expiresTick}
        </div>
      ))}
      {tariffs.map((t) => (
        <div key={`${t.ore}-${t.expiresTick}`} style={{ fontSize: 11, color: "var(--amber)" }}>
          ⇩ Tariff: {t.ore} ×{t.multiplier} — until T{t.expiresTick}
        </div>
      ))}
      {openVotes.map((v) => (
        <div key={v.id} style={{ fontSize: 11, marginTop: 4 }}>
          <div style={{ color: "var(--text-hi)" }}>🗳 {v.description}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
            <button
              type="button"
              className="fa-btn"
              style={{ fontSize: 10, padding: "1px 8px" }}
              onClick={() => onCommand({ kind: "councilVoteRespond", voteId: v.id, accept: true })}
            >
              Support
            </button>
            <button
              type="button"
              className="fa-btn"
              style={{ fontSize: 10, padding: "1px 8px" }}
              onClick={() => onCommand({ kind: "councilVoteRespond", voteId: v.id, accept: false })}
            >
              Oppose
            </button>
            <span style={{ color: "var(--text-lo)", fontSize: 10, alignSelf: "center" }}>
              auto-passes T{v.resolveTick}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiplomacyPanel({ snapshot, onCommand }: Props) {
  const open = useUiStore((s) => s.diplomacyPanelOpen);
  const toggleDiplomacyPanel = useUiStore((s) => s.toggleDiplomacyPanel);

  if (!open) return null;

  return (
    <div
      className="fa-panel fa-panel-slide"
      style={{
        position: "absolute",
        top: 72,
        left: 0,
        bottom: 0,
        width: 320,
        zIndex: 18,
        display: "flex",
        flexDirection: "column",
        borderTop: "2px solid var(--accent)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 13,
            color: "var(--accent)",
            letterSpacing: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          DIPLOMACY
          <HelpTip text="Negotiate treaties with rival factions. Relations affect trade prices and aggression." />
        </span>
        <button
          type="button"
          className="fa-btn"
          onClick={toggleDiplomacyPanel}
          aria-label="Close diplomacy panel"
          style={{ padding: "2px 8px", fontSize: 12 }}
        >
          ✕
        </button>
      </div>

      {/* Federal Council — sanctions and open votes (adopted sim only) */}
      {isV2Snapshot(snapshot) && <CouncilSection snapshot={snapshot} onCommand={onCommand} />}

      {/* Entries */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {snapshot.diplomacy.length === 0 ? (
          <div
            style={{
              padding: "24px 0",
              textAlign: "center",
              color: "var(--text-lo)",
              fontFamily: "var(--font-data)",
              fontSize: 12,
              letterSpacing: 0.5,
            }}
          >
            No rival factions detected
          </div>
        ) : (
          snapshot.diplomacy.map((entry) => (
            <DiplomacyRow key={entry.playerId} entry={entry} onCommand={onCommand} />
          ))
        )}
      </div>
    </div>
  );
}
