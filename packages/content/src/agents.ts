import rawAgents from "../data/agents.json" with { type: "json" };

export interface AgentDef {
  readonly id: string;
  readonly name: string;
  readonly stealth: number;
  readonly hireCost: number;
}

const allDefs: AgentDef[] = rawAgents.map((raw) => {
  if (raw.stealth < 1 || raw.stealth > 100) {
    throw new Error(`Agent "${raw.id}" has invalid stealth: ${raw.stealth}`);
  }
  return raw as AgentDef;
});

export function getAllAgentDefs(): ReadonlyArray<AgentDef> {
  return allDefs;
}
