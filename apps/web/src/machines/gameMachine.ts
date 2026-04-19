import { assign, setup } from "xstate";

interface GameContext {
  seed: number;
  difficulty: string;
  timeScale: number;
}

type GameEvent =
  | { type: "START_GAME"; seed: number; difficulty: string }
  | { type: "LOADED" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "GAME_OVER" }
  | { type: "VICTORY" }
  | { type: "MAIN_MENU" };

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
}).createMachine({
  id: "game",
  initial: "mainMenu",
  context: {
    seed: 0,
    difficulty: "manager",
    timeScale: 1,
  },
  states: {
    mainMenu: {
      on: {
        START_GAME: {
          target: "loading",
          actions: assign(({ event }) => ({
            seed: event.seed,
            difficulty: event.difficulty,
          })),
        },
      },
    },
    loading: {
      on: {
        LOADED: { target: "playing" },
      },
    },
    playing: {
      on: {
        PAUSE: { target: "paused" },
        GAME_OVER: { target: "gameOver" },
        VICTORY: { target: "victory" },
      },
    },
    paused: {
      on: {
        RESUME: { target: "playing" },
        MAIN_MENU: { target: "mainMenu" },
      },
    },
    gameOver: {
      on: {
        MAIN_MENU: { target: "mainMenu" },
      },
    },
    victory: {
      on: {
        MAIN_MENU: { target: "mainMenu" },
      },
    },
  },
});
