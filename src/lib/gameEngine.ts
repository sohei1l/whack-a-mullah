import {
  GameState,
  MullahState,
  GameData,
  GameConfig,
  MullahInHole,
  DEFAULT_CONFIG,
} from './gameTypes';

export class GameEngine {
  private config: GameConfig;
  private data: GameData;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.data = this.createInitialGameData();
  }

  private createInitialGameData(): GameData {
    const highScore = typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('whackAMullahHighScore') || '0', 10)
      : 0;

    return {
      state: GameState.START,
      score: 0,
      highScore,
      combo: 0,
      maxCombo: 0,
      whacks: 0,
      timeRemaining: this.config.gameDuration,
      difficulty: 0,
      mullahs: [this.createHiddenMullah([])],
      lastWhackedHole: -1,
      hitEffectTimer: 0,
      missEffectTimer: 0,
      missEffectHole: -1,
      shakeTimer: 0,
      shakeIntensity: 0,
    };
  }

  private hasActiveRat(): boolean {
    return this.data?.mullahs?.some(m => m.isRat && m.state !== MullahState.HIDDEN) ?? false;
  }

  private createHiddenMullah(occupiedHoles: number[]): MullahInHole {
    let holeIndex: number;
    const available = [];
    for (let i = 0; i < this.config.holes.length; i++) {
      if (!occupiedHoles.includes(i)) available.push(i);
    }
    holeIndex = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : Math.floor(Math.random() * this.config.holes.length);

    // Rat spawns: ~40% chance starting from difficulty 1, but only one rat at a time
    const isRat = !this.hasActiveRat() && (this.data?.difficulty ?? 0) >= 1 && Math.random() < 0.40;
    const speed = this.getRandomSpeed();

    return {
      holeIndex,
      state: MullahState.HIDDEN,
      stateTimer: this.getRandomHiddenDuration(),
      popProgress: 0,
      walkFrame: 0,
      dizzyRotation: 0,
      fingerWagFrame: 0,
      speed: isRat ? speed * 1.15 : speed,
      stars: 0,
      isRat,
    };
  }

  private getRandomSpeed(): number {
    const difficultyBonus = this.data ? this.data.difficulty * 0.008 : 0;
    return this.config.baseRiseSpeed + difficultyBonus + Math.random() * 0.02;
  }

  private getRandomThreatenDuration(): number {
    const difficultyReduction = (this.data?.difficulty || 0) * 8;
    const min = this.config.minThreatenDuration;
    const max = Math.max(min + 15, this.config.maxThreatenDuration - difficultyReduction);
    return min + Math.random() * (max - min);
  }

  private getRandomHiddenDuration(): number {
    const difficultyReduction = (this.data?.difficulty || 0) * 5;
    const min = this.config.minHiddenDuration;
    const max = Math.max(min + 15, this.config.maxHiddenDuration - difficultyReduction);
    return min + Math.random() * (max - min);
  }

  private getOccupiedHoles(): number[] {
    return this.data.mullahs
      .filter(m => m.state !== MullahState.HIDDEN)
      .map(m => m.holeIndex);
  }

  private getRandomHoleIndex(currentHole: number): number {
    const occupied = this.getOccupiedHoles();
    const available = [];
    for (let i = 0; i < this.config.holes.length; i++) {
      if (i !== currentHole && !occupied.includes(i)) available.push(i);
    }
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    // Fallback: just pick a different hole
    let newHole: number;
    do {
      newHole = Math.floor(Math.random() * this.config.holes.length);
    } while (newHole === currentHole);
    return newHole;
  }

  // How many mullahs should be active based on difficulty
  private getTargetMullahCount(): number {
    const d = this.data.difficulty;
    if (d >= 6) return 3;
    if (d >= 3) return 2;
    return 1;
  }

  public getData(): GameData {
    return this.data;
  }

  public getConfig(): GameConfig {
    return this.config;
  }

  public startGame(): void {
    const highScore = this.data.highScore;
    this.data = this.createInitialGameData();
    this.data.highScore = highScore;
    this.data.state = GameState.PLAYING;
    this.data.mullahs[0].stateTimer = 30; // Short initial delay
  }

  public handleWhack(clickX: number, clickY: number): number {
    // Returns index of whacked mullah, or -1 for miss
    if (this.data.state !== GameState.PLAYING) {
      if (this.data.state === GameState.START) {
        this.startGame();
      }
      // GAMEOVER: handled by UI button in component
      return -1;
    }

    // Check each mullah for a hit
    for (let mi = 0; mi < this.data.mullahs.length; mi++) {
      const mullah = this.data.mullahs[mi];
      const hole = this.config.holes[mullah.holeIndex];

      if ((mullah.state === MullahState.THREATENING || mullah.state === MullahState.RISING) &&
          mullah.popProgress > 0.3) {

        const mullahX = hole.x + hole.width / 2;
        const mullahY = hole.y - 75 * mullah.popProgress;
        const hitRadius = 60;

        const dx = clickX - mullahX;
        const dy = clickY - mullahY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < hitRadius) {
          this.scoreHit(mi);
          return mi;
        }
      }
    }

    // Miss
    this.data.combo = 0;

    let closestHole = -1;
    let closestDist = Infinity;
    for (let i = 0; i < this.config.holes.length; i++) {
      const h = this.config.holes[i];
      const hx = h.x + h.width / 2;
      const hy = h.y;
      const d = Math.sqrt((clickX - hx) ** 2 + (clickY - hy) ** 2);
      if (d < closestDist && d < 100) {
        closestDist = d;
        closestHole = i;
      }
    }
    if (closestHole >= 0) {
      this.data.missEffectTimer = 15;
      this.data.missEffectHole = closestHole;
    }

    return -1;
  }

  private scoreHit(mullahIndex: number): void {
    const mullah = this.data.mullahs[mullahIndex];

    mullah.state = MullahState.WHACKED;
    mullah.stateTimer = this.config.whackedDuration;
    mullah.dizzyRotation = 0;
    mullah.stars = 0;

    this.data.combo++;
    this.data.whacks++;
    const comboBonus = Math.min(this.data.combo - 1, 5);
    const basePoints = mullah.isRat ? 2 : 1;
    this.data.score += basePoints + comboBonus;

    if (this.data.combo > this.data.maxCombo) {
      this.data.maxCombo = this.data.combo;
    }

    if (this.data.score > this.data.highScore) {
      this.data.highScore = this.data.score;
      if (typeof window !== 'undefined') {
        localStorage.setItem('whackAMullahHighScore', this.data.highScore.toString());
      }
    }

    this.data.lastWhackedHole = mullah.holeIndex;
    this.data.hitEffectTimer = 20;
    this.data.shakeTimer = 8;
    this.data.shakeIntensity = mullah.isRat ? 6 : 4;
  }

  public update(): void {
    if (this.data.state !== GameState.PLAYING) return;

    this.data.timeRemaining--;
    if (this.data.timeRemaining <= 0) {
      this.data.state = GameState.GAMEOVER;
      if (this.data.score > this.data.highScore) {
        this.data.highScore = this.data.score;
        if (typeof window !== 'undefined') {
          localStorage.setItem('whackAMullahHighScore', this.data.highScore.toString());
        }
      }
      return;
    }

    this.data.difficulty = Math.floor(
      (this.config.gameDuration - this.data.timeRemaining) / this.config.difficultyInterval
    );

    if (this.data.hitEffectTimer > 0) this.data.hitEffectTimer--;
    if (this.data.missEffectTimer > 0) this.data.missEffectTimer--;
    if (this.data.shakeTimer > 0) this.data.shakeTimer--;

    // Manage mullah count based on difficulty
    const target = this.getTargetMullahCount();
    while (this.data.mullahs.length < target) {
      const occupied = this.data.mullahs.map(m => m.holeIndex);
      const newMullah = this.createHiddenMullah(occupied);
      newMullah.stateTimer = Math.floor(Math.random() * 30) + 10; // Stagger appearances
      this.data.mullahs.push(newMullah);
    }

    // Update all mullahs
    for (const mullah of this.data.mullahs) {
      this.updateMullah(mullah);
    }
  }

  private updateMullah(mullah: MullahInHole): void {
    mullah.walkFrame += 0.12;
    mullah.fingerWagFrame += 0.15;

    switch (mullah.state) {
      case MullahState.HIDDEN:
        mullah.stateTimer--;
        if (mullah.stateTimer <= 0) {
          mullah.state = MullahState.RISING;
          mullah.holeIndex = this.getRandomHoleIndex(mullah.holeIndex);
          mullah.speed = this.getRandomSpeed();
          if (mullah.isRat) mullah.speed *= 1.15;
          mullah.popProgress = 0;
        }
        break;

      case MullahState.RISING:
        mullah.popProgress += mullah.speed;
        if (mullah.popProgress >= 1) {
          mullah.popProgress = 1;
          mullah.state = MullahState.THREATENING;
          // Rats have shorter threaten window (harder to hit)
          const duration = this.getRandomThreatenDuration();
          mullah.stateTimer = mullah.isRat ? duration * 0.7 : duration;
        }
        break;

      case MullahState.THREATENING:
        mullah.stateTimer--;
        if (mullah.stateTimer <= 0) {
          mullah.state = MullahState.RETREATING;
          this.data.combo = 0;
        }
        break;

      case MullahState.WHACKED:
        mullah.stateTimer--;
        mullah.dizzyRotation += 0.2;
        mullah.stars += 0.08;
        if (mullah.stateTimer < this.config.whackedDuration * 0.6) {
          mullah.popProgress -= 0.03;
        }
        if (mullah.stateTimer <= 0 || mullah.popProgress <= 0) {
          mullah.popProgress = 0;
          mullah.state = MullahState.HIDDEN;
          mullah.stateTimer = this.getRandomHiddenDuration();
          // Re-roll rat status: only one rat at a time
          mullah.isRat = !this.hasActiveRat() && (this.data.difficulty >= 1) && Math.random() < 0.40;
        }
        break;

      case MullahState.RETREATING:
        mullah.popProgress -= this.config.retreatSpeed;
        if (mullah.popProgress <= 0) {
          mullah.popProgress = 0;
          mullah.state = MullahState.HIDDEN;
          mullah.stateTimer = this.getRandomHiddenDuration();
          // Re-roll rat status: only one rat at a time
          mullah.isRat = !this.hasActiveRat() && (this.data.difficulty >= 1) && Math.random() < 0.40;
        }
        break;
    }
  }
}
