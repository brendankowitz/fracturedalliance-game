import { bench, describe } from "vitest";
import { SimApi } from "../api.ts";

describe("sim tick throughput", () => {
  bench(
    "1000 ticks — normal difficulty",
    () => {
      const api = new SimApi({ seed: 42, humanPlayerRaceId: "helionCorp", difficulty: "normal" });
      for (let i = 0; i < 1000; i++) api.tick(50);
    },
    { time: 3000, warmupTime: 500 },
  );

  bench(
    "1000 ticks — brutal difficulty",
    () => {
      const api = new SimApi({ seed: 42, humanPlayerRaceId: "helionCorp", difficulty: "brutal" });
      for (let i = 0; i < 1000; i++) api.tick(50);
    },
    { time: 3000, warmupTime: 500 },
  );
});
