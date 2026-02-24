export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
}

export enum MullahState {
  HIDDEN = 'HIDDEN',
  RISING = 'RISING',
  THREATENING = 'THREATENING',
  WHACKED = 'WHACKED',
  RETREATING = 'RETREATING',
}

export interface Hole {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MullahInHole {
  holeIndex: number;
  state: MullahState;
  stateTimer: number;
  popProgress: number;
  walkFrame: number;
  dizzyRotation: number;
  fingerWagFrame: number;
  speed: number;
  stars: number;
  isRat: boolean;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  holes: Hole[];
  tableX: number;
  tableY: number;
  tableW: number;
  tableH: number;
  baseRiseSpeed: number;
  baseThreatenDuration: number;
  minThreatenDuration: number;
  maxThreatenDuration: number;
  baseHiddenDuration: number;
  minHiddenDuration: number;
  maxHiddenDuration: number;
  whackedDuration: number;
  retreatSpeed: number;
  gameDuration: number;
  difficultyInterval: number;
}

export interface GameData {
  state: GameState;
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  whacks: number;
  timeRemaining: number;
  difficulty: number;
  mullahs: MullahInHole[];
  lastWhackedHole: number;
  hitEffectTimer: number;
  missEffectTimer: number;
  missEffectHole: number;
  shakeTimer: number;
  shakeIntensity: number;
}

export const HOLE_LAYOUT: Hole[] = [
  // Top row
  { x: 145, y: 185, width: 100, height: 38 },
  { x: 350, y: 185, width: 100, height: 38 },
  { x: 555, y: 185, width: 100, height: 38 },
  // Bottom row
  { x: 145, y: 305, width: 100, height: 38 },
  { x: 350, y: 305, width: 100, height: 38 },
  { x: 555, y: 305, width: 100, height: 38 },
];

export const PORTRAIT_HOLE_LAYOUT: Hole[] = [
  // Row 1
  { x: 80, y: 260, width: 100, height: 38 },
  { x: 220, y: 260, width: 100, height: 38 },
  // Row 2
  { x: 80, y: 380, width: 100, height: 38 },
  { x: 220, y: 380, width: 100, height: 38 },
  // Row 3
  { x: 80, y: 500, width: 100, height: 38 },
  { x: 220, y: 500, width: 100, height: 38 },
];

const SHARED_GAME_CONFIG = {
  baseRiseSpeed: 0.055,
  baseThreatenDuration: 100,
  minThreatenDuration: 30,
  maxThreatenDuration: 150,
  baseHiddenDuration: 50,
  minHiddenDuration: 12,
  maxHiddenDuration: 80,
  whackedDuration: 35,
  retreatSpeed: 0.08,
  gameDuration: 20 * 60,
  difficultyInterval: 150,
};

export const DEFAULT_CONFIG: GameConfig = {
  ...SHARED_GAME_CONFIG,
  canvasWidth: 800,
  canvasHeight: 400,
  holes: HOLE_LAYOUT,
  tableX: 60,
  tableY: 130,
  tableW: 680,
  tableH: 240,
};

export const PORTRAIT_CONFIG: GameConfig = {
  ...SHARED_GAME_CONFIG,
  canvasWidth: 400,
  canvasHeight: 700,
  holes: PORTRAIT_HOLE_LAYOUT,
  tableX: 30,
  tableY: 140,
  tableW: 340,
  tableH: 440,
};
