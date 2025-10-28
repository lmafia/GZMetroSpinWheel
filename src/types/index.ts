export interface MetroLine {
  id: string;
  name: string;
  color: string;
  stations: string[];
}

export interface MetroStation {
  name: string;
  lines: Array<{
    name: string;
    color: string;
  }>;
}

export type GameMode = 'single' | 'double';

export interface GameState {
  mode: GameMode | null;
  selectedLine: MetroLine | null;
  selectedStation: MetroStation | null;
  isSpinning: boolean;
}
