# Diplomacy findings — the NAP problem is wiring, not price

Read-only diagnosis, 2026-07-25. Nothing implemented. Hands off to the human's scoping
conversation alongside medical/security/overcrowding and the strike event.

## Summary

Fable observed all five rivals accepting a Non-Aggression Pact at reputation 0 on day 12,
and asked whether the AI's attack scoring honours a NAP at all. It does not.

**The received framing — "six clicks buy permanent peace" — is wrong, and the fix everyone
reached for makes things worse.** Peace is not too cheap. **Peace is inert.** Nothing on
the AI's offensive path consults treaties, so a signed NAP restrains nobody. Raising the
acceptance threshold would make NAPs *harder to obtain while still doing nothing*.

**Wiring first, then tuning.**

## 1. Wiring — the serious half

`packages/fab-ai/src/agents/actions.ts` has no `AttackAction`. Offence is
`DispatchFleetAction` and `LaunchMissileAction`. Grepping treaty/pact across all of
`fab-ai/src` hits **only** the proposal helpers (`treatyCandidates`,
`hasExistingTreatyWith`, the post-`treaty.broken` cooling set) and `DeclareWarAction`.
`DispatchFleetAction`'s scoring and target selection reference neither treaty nor war
state.

Also: **`fab-ai` never sends `respondTreaty`** — zero matches. Acceptance is decided
sim-side in `handleProposeTreaty`, which calls `shouldAcceptTreaty` and signs
immediately. `handleRespondTreaty` performs no evaluation; it signs if `accept` is true.
So that one function is the entire acceptance model for both the human-facing and
AI-facing paths — a good place to change behaviour and a dangerous one to change
carelessly.

### Observed

Headless probe through `SimApiV2`, seed 7331, Director, 200 sim-days after signing:

```
RIVALS 5 | NAPs signed 5 | NAPs still held after 200d 5
COMBAT FLASHES 19174
colony.under_attack x4122
```

All five NAPs signed, none broken across 200 sim-days, and heavy sustained combat
throughout. A NAP is signed, held, and ignored.

## 2. Tuning — the smaller half

`packages/fab-sim/src/systems/diplomacy.ts:51`, `shouldAcceptTreaty`:

```
base   = treatyRespect - aggression * 0.5
accept = base + rep/100 + typeBias > 0.1      // nonAggression typeBias = +0.2
```

At reputation 0 a NAP accepts whenever `treatyRespect - 0.5*aggression > -0.1`. A race
must satisfy `aggression > 2*(treatyRespect + 0.1)` to refuse — a middling race (respect
0.5, aggression 0.5) scores 0.45 against a 0.1 bar. Hence all five, on Director as well as
Manager. It also explains why defensive pacts and joint wars *are* refused: their typeBias
is -0.1 and -0.2, a 0.3-0.4 swing.

**The 0.1 threshold is deliberate.** The comment records it being lowered from 0.5 to stop
AI-to-AI proposal spam — 100 of 109 commands per AI were re-proposals to perpetually
rejecting neighbours. That is a real constraint, not an oversight. **Reverting to 0.5
would resurrect the spam.**

## 3. Suggested shape

1. `DispatchFleetAction` and `LaunchMissileAction` score 0 against a player the actor
   holds a `nonAggression` or `peace` treaty with. The helper already exists on the
   proposal side (`hasExistingTreatyWith`), so this is small.
2. *Then* revisit the threshold, with the spam constraint in mind. An **asymmetric bar** —
   stricter for human-facing proposals than AI-to-AI — is the likely answer rather than a
   revert.

Do (1) before (2). Tuning the price of a mechanic with no effect is wasted work, and would
make the game feel *less* responsive, not more.

## 4. What is proven, and what is not

**Proven:** no code path consults treaties when selecting fleet or missile targets; all
five rivals accept a NAP at reputation 0; the NAPs are still held after 200 sim-days;
heavy combat occurs throughout that window.

**Not proven:** that the attacks observed were aimed at *the human*. The V2 snapshot
exposes events as `{kind, priority}` only, with no attacker or target attribution, so the
probe cannot distinguish human-directed aggression from AI-vs-AI. Given the code reading,
human-directed attacks are the strong expectation — but it is an inference, not an
observation, and a headed play session would settle it.

**Method caveat:** event counts above are inflated. The probe accumulates
`snapshot.events` every tick, and an event persisting in the queue across ticks is counted
repeatedly. Treat the figures as evidence of *sustained* combat, not as exact tallies. The
load-bearing facts are the ratios and the non-zero-under-held-NAP result.
