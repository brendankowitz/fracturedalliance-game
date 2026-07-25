# Landing the console shell in `HUD.tsx`

Held until Fable's Phase D panels commit. Everything else is already on
`feature/playability` (`0e6f2ba`, `c2ad662`); this is the only remaining edit, and it
touches one file.

## The edit

In `apps/web/src/hud/HUD.tsx`:

1. Add the import:

```diff
+import { ColonyConsole } from "./ColonyConsole.tsx";
```

2. Replace the fragment wrapper and drop the `<ResourceBar>` / `<NavBar>` renders, which
   the console supplies itself:

```diff
   return (
-    <>
-      <ResourceBar
-        credits={snapshot.credits}
-        federationStanding={snapshot.federationStanding}
-        date={snapshot.date}
-        day={snapshot.day}
-        seed={snapshot.seed}
-        difficulty={snapshot.difficulty}
-      />
-
-      <NavBar
-        ...all props...
-      />
-
+    <ColonyConsole snapshot={snapshot}>
       <BlackMarketPanel onCommand={onCommand} />
       ... every other panel, unchanged ...
-    </>
+    </ColonyConsole>
   );
```

3. Delete the now-unused `NavBar` component and its props interface (roughly lines
   31–362), and the `ResourceBar` import. `SpeedControl` moves inside the console; it is
   already imported by `ResourceBar`, which `ColonyConsole` no longer uses — check whether
   `ResourceBar.tsx` still has a caller before deleting anything from it.

Nothing else in the file moves. The accessibility cluster currently in `NavBar`
(colour palette, text scale, Eco, Help, Turn, Keys, achievements) needs a home — it
should go in `ConsoleTabs`' `trailing` slot, which exists for exactly that.

## What lands with it

`ColonyConsole` supplies the header (faction, standing, credits), the section tabs, the
build palette rail, the build-queue/live-feed rail, the colony switcher, the vitals bar
and the status bar. It reads the armed building kind from `buildStore`, which
`SurfaceView` also reads, so no state is threaded through `HUD.tsx`.

## What panel owners need to know

The console's viewport is `position: relative`. Every absolutely-positioned panel
rendered inside it resolves its `top` / `right` against that viewport instead of the
window, so panels land inside the frame without being edited. Expect each to want its
offsets nudged once — a one-line change per panel — because the viewport no longer starts
at the top-left of the screen. Panels currently offset for the old 40px header plus 32px
nav (`top: 72`) will sit too low by roughly that much.

## Verification after landing

- `pnpm -r typecheck`, `pnpm -r test`, `pnpm lint`
- Play it: the surface should fill the central viewport, the palette should filter and
  arm a kind, clicking the rock should place it, and the vitals bar should show happiness
  against its STABLE / UNREST / SECEDING thresholds.
