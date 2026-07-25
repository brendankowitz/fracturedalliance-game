export type Verdict = 'inProgress' | 'won' | 'lost';
export type SaveDifficulty = 'intern' | 'manager' | 'director' | 'ceo' | 'board';

export interface UiPrefs {
  volumeMaster: number;
  volumeMusic: number;
  volumeSfx: number;
  colourblindMode: 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  textScale: number;
  reduceMotion: boolean;
  autoPauseOn: {
    red: boolean;
    amber: boolean;
    grey: boolean;
  };
  speedOnResume: 0.5 | 1 | 2 | 4 | 8;
}

export interface SaveV1 {
  schemaVersion: 1;
  createdAtIso: string;
  updatedAtIso: string;
  gameVersion: string;
  playerName: string;
  verdict: Verdict;
  difficulty: SaveDifficulty;
  /** Base64-encoded gzip of the JSON-serialised World. */
  worldBlob: string;
  uiPrefs: UiPrefs;
}

export type LatestSave = SaveV1;
