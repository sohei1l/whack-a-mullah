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
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  holes: Hole[];
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

export const DEFAULT_CONFIG: GameConfig = {
  canvasWidth: 800,
  canvasHeight: 400,
  holes: HOLE_LAYOUT,
  baseRiseSpeed: 0.07,
  baseThreatenDuration: 80,
  minThreatenDuration: 20,
  maxThreatenDuration: 120,
  baseHiddenDuration: 45,
  minHiddenDuration: 8,
  maxHiddenDuration: 70,
  whackedDuration: 35,
  retreatSpeed: 0.1,
  gameDuration: 60 * 60,
  difficultyInterval: 450, // Every 7.5 seconds
};
