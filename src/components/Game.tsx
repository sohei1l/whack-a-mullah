'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { GameEngine } from '@/lib/gameEngine';
import { GameState, MullahState, Hole, MullahInHole, DEFAULT_CONFIG, PORTRAIT_CONFIG, GameConfig } from '@/lib/gameTypes';

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// Web Audio sound synthesizer
class SoundEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;

  // Must be called directly inside a user gesture (click/touchstart) to unlock audio on mobile
  unlock() {
    try {
      if (!this.ctx) {
        const W = window as unknown as Record<string, unknown>;
        const AudioCtx = (W.AudioContext || W.webkitAudioContext) as typeof AudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      // Always resume on every gesture - iOS can re-suspend
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      // Play a real oscillator (nearly silent) to fully unlock on iOS
      if (!this.unlocked && this.ctx.state !== 'closed') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(0);
        osc.stop(this.ctx.currentTime + 0.001);
        this.unlocked = true;
      }
    } catch {}
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      const W = window as unknown as Record<string, unknown>;
      const AudioCtx = (W.AudioContext || W.webkitAudioContext) as typeof AudioContext;
      this.ctx = new AudioCtx();
    }
    // Always try to resume in case it got suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playWhack() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.15);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  playSqueak() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  playPopUp() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  playRetreat() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  playMiss() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  playCombo() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.1);
      });
    } catch {}
  }

  playGameOver() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const notes = [440, 392, 349, 261];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.2);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.25);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.3);
      });
    } catch {}
  }

  playCountdown() {
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 880;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }
}

// Floating score particles
interface ScoreParticle {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

// Confetti particles for game over celebration
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  w: number;
  h: number;
}

function spawnConfetti(canvasWidth: number): ConfettiParticle[] {
  const colors = ['#FF0000', '#FFD700', '#00CC00', '#0088FF', '#FF6600', '#CC00FF', '#FF1493', '#00FFCC', '#FF4444', '#44FF44'];
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < 180; i++) {
    particles.push({
      x: Math.random() * canvasWidth,
      y: -Math.random() * 300 - 20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      w: Math.random() * 8 + 4,
      h: Math.random() * 5 + 2,
    });
  }
  return particles;
}

function getPlayAgainRect(cw: number, ch: number) {
  const isSmall = cw < 500;
  const btnY = isSmall ? ch * 0.82 : ch * 0.82;
  return { x: cw / 2 - 100, y: btnY, w: 200, h: 50 };
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const soundRef = useRef<SoundEngine | null>(null);
  const particlesRef = useRef<ScoreParticle[]>([]);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const prevMullahStatesRef = useRef<Map<number, MullahState>>(new Map());
  const lastCountdownSecRef = useRef<number>(-1);
  const [isPortrait, setIsPortrait] = useState<boolean | null>(null);

  // Detect orientation
  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getActiveConfig = useCallback((): GameConfig => {
    return isPortrait ? PORTRAIT_CONFIG : DEFAULT_CONFIG;
  }, [isPortrait]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, engine: GameEngine, frameCount: number) => {
    const config = engine.getConfig();
    const data = engine.getData();

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (data.shakeTimer > 0) {
      shakeX = Math.sin(frameCount * 1.5) * data.shakeIntensity * (data.shakeTimer / 8);
      shakeY = Math.cos(frameCount * 1.8) * data.shakeIntensity * (data.shakeTimer / 8);
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background - desert/earthy theme
    const groundY = config.tableY - 10;
    const skyEnd = Math.min(0.4, (groundY - 20) / config.canvasHeight);

    const gradient = ctx.createLinearGradient(0, 0, 0, config.canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(skyEnd, '#B8D4E3');
    gradient.addColorStop(Math.min(skyEnd + 0.1, 0.99), '#D2B48C');
    gradient.addColorStop(1, '#8B7355');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Desert ground
    ctx.fillStyle = '#C9A96E';
    ctx.fillRect(0, groundY, config.canvasWidth, config.canvasHeight - groundY);

    // Ground texture lines
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < config.canvasWidth; i += 60) {
      ctx.moveTo(i + Math.sin(i * 0.1) * 10, groundY);
      ctx.lineTo(i + 20, config.canvasHeight);
    }
    ctx.stroke();

    // Distant dunes
    ctx.fillStyle = '#D4B896';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 8);
    for (let i = 0; i <= config.canvasWidth; i += 50) {
      ctx.lineTo(i, groundY + Math.sin(i * 0.008 + 1) * 12);
    }
    ctx.lineTo(config.canvasWidth, groundY + 15);
    ctx.lineTo(0, groundY + 15);
    ctx.closePath();
    ctx.fill();

    // === WOODEN TABLE ===
    const { tableX, tableY, tableW, tableH } = config;
    const tableR = 12;

    // Table shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(tableX + 6, tableY + 6, tableW, tableH, tableR);
    ctx.fill();

    // Table body - dark wood
    ctx.fillStyle = '#6B3A2A';
    ctx.beginPath();
    ctx.roundRect(tableX, tableY, tableW, tableH, tableR);
    ctx.fill();

    // Table top - lighter wood
    const topGrad = ctx.createLinearGradient(tableX, tableY, tableX, tableY + tableH);
    topGrad.addColorStop(0, '#8B5E3C');
    topGrad.addColorStop(0.15, '#A0714F');
    topGrad.addColorStop(0.5, '#8B5E3C');
    topGrad.addColorStop(1, '#6B3A2A');
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.roundRect(tableX + 4, tableY + 4, tableW - 8, tableH - 8, tableR - 2);
    ctx.fill();

    // Wood grain lines
    ctx.strokeStyle = 'rgba(90, 50, 25, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gy = tableY + 20; gy < tableY + tableH - 10; gy += 18) {
      ctx.moveTo(tableX + 15, gy + Math.sin(gy * 0.05) * 3);
      for (let gx = tableX + 15; gx < tableX + tableW - 15; gx += 10) {
        ctx.lineTo(gx, gy + Math.sin(gx * 0.02 + gy * 0.03) * 2);
      }
    }
    ctx.stroke();

    // Table border/rim
    ctx.strokeStyle = '#5A3220';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tableX, tableY, tableW, tableH, tableR);
    ctx.stroke();

    // Table legs
    ctx.fillStyle = '#5A3220';
    ctx.fillRect(tableX + 20, tableY + tableH, 16, 30);
    ctx.fillRect(tableX + tableW - 36, tableY + tableH, 16, 30);
    ctx.fillStyle = '#4A2818';
    ctx.fillRect(tableX + 20, tableY + tableH, 16, 4);
    ctx.fillRect(tableX + tableW - 36, tableY + tableH, 16, 4);

    // Heat shimmer effect
    if (data.state === GameState.PLAYING) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let i = 0; i < 3; i++) {
        const shimmerX = (i * 250 + frameCount * 0.4) % (config.canvasWidth + 100) - 50;
        const shimmerY = Math.min(100, groundY - 30) + Math.sin(frameCount * 0.03 + i * 2) * 5;
        ctx.beginPath();
        ctx.ellipse(shimmerX, shimmerY, 50, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw holes and mullahs
    if (data.state === GameState.PLAYING || data.state === GameState.GAMEOVER) {
      drawHoles(ctx, config.holes, data, frameCount);
      drawHUD(ctx, config, data, frameCount);
      drawParticles(ctx, particlesRef.current);
    }

    ctx.restore();

    // Draw overlays (outside shake transform)
    if (data.state === GameState.START) {
      drawStartOverlay(ctx, config.canvasWidth, config.canvasHeight, frameCount);
    } else if (data.state === GameState.GAMEOVER) {
      drawGameOverOverlay(ctx, config.canvasWidth, config.canvasHeight, data, frameCount, confettiRef.current);
    }
  }, []);

  function drawHoles(ctx: CanvasRenderingContext2D, holes: Hole[], data: ReturnType<GameEngine['getData']>, frameCount: number) {
    for (let i = 0; i < holes.length; i++) {
      const hole = holes[i];

      // Hole shadow
      ctx.fillStyle = 'rgba(80, 60, 30, 0.4)';
      ctx.beginPath();
      ctx.ellipse(hole.x + hole.width / 2, hole.y + 10, hole.width / 2 + 10, hole.height / 2 + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hole rim
      ctx.fillStyle = '#A08050';
      ctx.beginPath();
      ctx.ellipse(hole.x + hole.width / 2, hole.y + 5, hole.width / 2 + 6, hole.height / 2 + 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main hole
      ctx.fillStyle = '#3D2B1F';
      ctx.beginPath();
      ctx.ellipse(hole.x + hole.width / 2, hole.y, hole.width / 2, hole.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner shadow gradient
      const holeGrad = ctx.createRadialGradient(
        hole.x + hole.width / 2, hole.y, 0,
        hole.x + hole.width / 2, hole.y, hole.width / 2
      );
      holeGrad.addColorStop(0, '#1A0F0A');
      holeGrad.addColorStop(1, '#3D2B1F');
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.ellipse(hole.x + hole.width / 2, hole.y, hole.width / 2 - 4, hole.height / 2 - 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw any character in this hole
      const mullahInThisHole = data.mullahs.find(m => m.holeIndex === i && m.popProgress > 0);
      if (mullahInThisHole) {
        // Clip region - wider to show finger extending to the right side
        ctx.save();
        ctx.beginPath();
        ctx.rect(hole.x - 25, 0, hole.width + 65, hole.y + hole.height / 2);
        ctx.clip();

        if (mullahInThisHole.isRat) {
          drawRat(ctx, hole, mullahInThisHole, frameCount);
        } else {
          drawMullah(ctx, hole, mullahInThisHole, frameCount);
        }

        ctx.restore();

        // Redraw hole rim on top
        ctx.fillStyle = '#A08050';
        ctx.beginPath();
        ctx.ellipse(hole.x + hole.width / 2, hole.y + 5, hole.width / 2 + 6, hole.height / 2 + 4, 0, Math.PI * 0.05, Math.PI * 0.95);
        ctx.fill();

        ctx.fillStyle = '#3D2B1F';
        ctx.beginPath();
        ctx.ellipse(hole.x + hole.width / 2, hole.y, hole.width / 2, hole.height / 2, 0, Math.PI * 0.05, Math.PI * 0.95);
        ctx.fill();
      }

      // Miss effect
      if (data.missEffectTimer > 0 && data.missEffectHole === i) {
        const alpha = data.missEffectTimer / 15;
        ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const missSize = (15 - data.missEffectTimer) * 3;
        ctx.arc(hole.x + hole.width / 2, hole.y - 20, missSize, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hole.x + hole.width / 2 - 12, hole.y - 32);
        ctx.lineTo(hole.x + hole.width / 2 + 12, hole.y - 8);
        ctx.moveTo(hole.x + hole.width / 2 + 12, hole.y - 32);
        ctx.lineTo(hole.x + hole.width / 2 - 12, hole.y - 8);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      // Hit effect
      if (data.hitEffectTimer > 0 && data.lastWhackedHole === i) {
        const alpha = data.hitEffectTimer / 20;
        const size = (20 - data.hitEffectTimer) * 4;

        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hole.x + hole.width / 2, hole.y - 40, size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 165, 0, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hole.x + hole.width / 2, hole.y - 40, size * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        for (let s = 0; s < 6; s++) {
          const angle = (s / 6) * Math.PI * 2 + frameCount * 0.1;
          const dist = size * 0.8;
          ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
          ctx.beginPath();
          ctx.arc(
            hole.x + hole.width / 2 + Math.cos(angle) * dist,
            hole.y - 40 + Math.sin(angle) * dist,
            3, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }
    }
  }

  function drawMullah(ctx: CanvasRenderingContext2D, hole: Hole, mullah: MullahInHole, frameCount: number) {
    const centerX = hole.x + hole.width / 2;
    const popOffset = 75 * mullah.popProgress;
    const baseY = hole.y - popOffset;

    const isWhacked = mullah.state === MullahState.WHACKED;
    const isThreatening = mullah.state === MullahState.THREATENING;
    const isRetreating = mullah.state === MullahState.RETREATING;

    ctx.save();
    ctx.translate(centerX, baseY);

    const S = 0.75;
    ctx.scale(S, S);

    if (isWhacked) {
      const wobble = Math.sin(mullah.dizzyRotation * 3) * 0.18;
      ctx.rotate(wobble);
    }

    if (isThreatening) {
      const sway = Math.sin(frameCount * 0.08) * 0.05;
      ctx.rotate(sway);
    }

    // --- BODY: Robe ---
    ctx.fillStyle = '#A67C52';
    ctx.beginPath();
    ctx.moveTo(-28, 10);
    ctx.quadraticCurveTo(-35, 45, -30, 80);
    ctx.lineTo(30, 80);
    ctx.quadraticCurveTo(35, 45, 28, 10);
    ctx.closePath();
    ctx.fill();

    const robeSwing = Math.sin(mullah.walkFrame) * 2;
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.moveTo(-22, 60);
    ctx.quadraticCurveTo(robeSwing, 72, 22, 60);
    ctx.lineTo(26, 80);
    ctx.lineTo(-26, 80);
    ctx.closePath();
    ctx.fill();

    // Aba (cloak)
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.ellipse(0, 22, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar
    ctx.fillStyle = '#9C8B75';
    ctx.beginPath();
    ctx.ellipse(0, 8, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Robe center line
    ctx.strokeStyle = '#6B5344';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, 70);
    ctx.stroke();

    // --- ARMS ---
    if (isThreatening) {
      // RIGHT ARM - extends to the RIGHT SIDE, finger wagging beside the mullah
      const fingerWag = Math.sin(mullah.fingerWagFrame * 2.5) * 6;

      // Upper arm from right shoulder going out to the right
      ctx.strokeStyle = '#A67C52';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(18, 20);
      ctx.quadraticCurveTo(32, 12, 40, 5);
      ctx.stroke();

      // Sleeve
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(18, 20);
      ctx.lineTo(24, 16);
      ctx.stroke();

      // Forearm going up-right
      ctx.strokeStyle = '#DEB887';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(40, 5);
      ctx.lineTo(48, -10 + fingerWag * 0.3);
      ctx.stroke();

      // Hand / fist
      ctx.fillStyle = '#DEB887';
      ctx.beginPath();
      ctx.arc(49, -13 + fingerWag * 0.3, 6, 0, Math.PI * 2);
      ctx.fill();

      // POINTING FINGER - extending up-right from fist, wagging
      ctx.strokeStyle = '#DEB887';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(50, -19 + fingerWag * 0.3);
      ctx.lineTo(54, -38 + fingerWag * 0.5);
      ctx.stroke();

      // Finger tip
      ctx.fillStyle = '#DEBA87';
      ctx.beginPath();
      ctx.arc(54, -40 + fingerWag * 0.5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Curled fingers on fist
      ctx.strokeStyle = '#D4AA78';
      ctx.lineWidth = 2.5;
      for (let f = -1; f <= 1; f++) {
        ctx.beginPath();
        ctx.arc(49 + f * 2.5, -13 + fingerWag * 0.3, 4, Math.PI * 0.3, Math.PI * 1.2);
        ctx.stroke();
      }

      // LEFT ARM - clenched at side
      ctx.strokeStyle = '#A67C52';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-15, 20);
      ctx.quadraticCurveTo(-28, 30, -20, 42);
      ctx.stroke();

      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-15, 20);
      ctx.lineTo(-20, 26);
      ctx.stroke();

      ctx.fillStyle = '#DEB887';
      ctx.beginPath();
      ctx.arc(-20, 44, 5, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Arms at sides
      ctx.strokeStyle = '#A67C52';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-20, 25);
      ctx.quadraticCurveTo(-28, 38, -22, 48);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, 25);
      ctx.quadraticCurveTo(28, 38, 22, 48);
      ctx.stroke();
    }

    ctx.lineCap = 'butt';

    // --- HEAD ---
    ctx.save();
    ctx.translate(0, -15);

    ctx.fillStyle = isWhacked ? '#E8C8A0' : '#DEB887';
    ctx.beginPath();
    ctx.arc(0, 5, 22, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.ellipse(-22, 5, 5, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 5, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beard
    ctx.fillStyle = '#F5F5F5';
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.quadraticCurveTo(-20, 23, -13, 36);
    ctx.quadraticCurveTo(0, 43, 13, 36);
    ctx.quadraticCurveTo(20, 23, 16, 10);
    ctx.quadraticCurveTo(0, 16, -16, 10);
    ctx.fill();

    // Beard texture
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 1;
    for (let bi = -10; bi <= 10; bi += 4) {
      ctx.beginPath();
      ctx.moveTo(bi, 14);
      ctx.quadraticCurveTo(bi + 1, 26, bi, 34);
      ctx.stroke();
    }

    // Big nose
    ctx.fillStyle = '#C9A66B';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(-5, 4, -3, 9);
    ctx.quadraticCurveTo(0, 11, 3, 9);
    ctx.quadraticCurveTo(5, 4, 0, -2);
    ctx.fill();

    if (isWhacked) {
      // DIZZY FACE
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      for (let s = 0; s < 2; s++) {
        ctx.beginPath();
        const spiralOffset = mullah.dizzyRotation + s * Math.PI;
        for (let t = 0; t < 8; t++) {
          const angle = spiralOffset + t * 0.8;
          const radius = t * 0.8;
          const sx = -8 + Math.cos(angle) * radius;
          const sy = 0 + Math.sin(angle) * radius;
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      for (let s = 0; s < 2; s++) {
        ctx.beginPath();
        const spiralOffset = -mullah.dizzyRotation + s * Math.PI;
        for (let t = 0; t < 8; t++) {
          const angle = spiralOffset + t * 0.8;
          const radius = t * 0.8;
          const sx = 8 + Math.cos(angle) * radius;
          const sy = 0 + Math.sin(angle) * radius;
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Dazed mouth
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const mouthWobble = Math.sin(mullah.dizzyRotation * 2) * 3;
      ctx.moveTo(-6, 14 + mouthWobble);
      ctx.quadraticCurveTo(0, 18 - mouthWobble, 6, 14 + mouthWobble);
      ctx.stroke();

      // Dizzy stars
      const starColors = ['#FFD700', '#FFA500', '#FF6347'];
      for (let si = 0; si < 3; si++) {
        const starAngle = mullah.stars * 3 + (si * Math.PI * 2) / 3;
        const starRadius = 30;
        const sx = Math.cos(starAngle) * starRadius;
        const sy = -20 + Math.sin(starAngle) * 10;
        ctx.fillStyle = starColors[si];
        drawStar(ctx, sx, sy, 5, 5, 2.5);
      }

      // Red bump
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.arc(5, -22, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF6666';
      ctx.beginPath();
      ctx.arc(4, -24, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (isThreatening) {
      // === FURIOUS THREATENING FACE ===
      const angerPulse = 0.3 + Math.sin(frameCount * 0.15) * 0.1;
      ctx.fillStyle = `rgba(180, 30, 30, ${angerPulse})`;
      ctx.beginPath();
      ctx.arc(0, 5, 22, 0, Math.PI * 2);
      ctx.fill();

      // Veins on forehead
      ctx.strokeStyle = 'rgba(180, 50, 50, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -18);
      ctx.quadraticCurveTo(-5, -22, -2, -18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, -19);
      ctx.quadraticCurveTo(8, -23, 10, -18);
      ctx.stroke();

      // Wide angry eyes - bloodshot whites
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(-8, 0, 6, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(8, 0, 6, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bloodshot veins
      ctx.strokeStyle = 'rgba(200, 40, 40, 0.4)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-13, -1); ctx.lineTo(-10, 0);
      ctx.moveTo(-13, 1); ctx.lineTo(-10, 1.5);
      ctx.moveTo(13, -1); ctx.lineTo(10, 0);
      ctx.moveTo(13, 1); ctx.lineTo(10, 1.5);
      ctx.stroke();

      // Angry pupils
      ctx.fillStyle = '#000';
      const eyeShift = Math.sin(frameCount * 0.12) * 1.5;
      ctx.beginPath();
      ctx.arc(-8 + eyeShift, 0.5, 2.5, 0, Math.PI * 2);
      ctx.arc(8 + eyeShift, 0.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Red eye glint
      ctx.fillStyle = 'rgba(255, 50, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(-8 + eyeShift + 1, -0.5, 1, 0, Math.PI * 2);
      ctx.arc(8 + eyeShift + 1, -0.5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Heavy angry eyebrows
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.lineTo(-3, -2);
      ctx.moveTo(16, -10);
      ctx.lineTo(3, -2);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Brow wrinkles
      ctx.strokeStyle = '#B8976A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -14); ctx.lineTo(6, -14);
      ctx.moveTo(-4, -16); ctx.lineTo(4, -16);
      ctx.moveTo(-3, -18); ctx.lineTo(3, -18);
      ctx.stroke();

      // Shouting mouth
      ctx.fillStyle = '#3A0808';
      ctx.beginPath();
      ctx.ellipse(0, 15, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#EEEEEE';
      ctx.fillRect(-5, 11, 3, 3);
      ctx.fillRect(-1, 11, 3, 3);
      ctx.fillRect(3, 11, 3, 3);
      ctx.fillRect(-4, 17, 3, 2);
      ctx.fillRect(1, 17, 3, 2);

      ctx.strokeStyle = '#5C0000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 15, 7, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

    } else {
      // Default face (rising/retreating)
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(-8, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(8, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-7, 0, 2.5, 0, Math.PI * 2);
      ctx.arc(9, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-13, -7);
      ctx.lineTo(-3, -5);
      ctx.moveTo(13, -7);
      ctx.lineTo(3, -5);
      ctx.stroke();

      ctx.strokeStyle = '#997777';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (isRetreating) {
        ctx.arc(0, 12, 5, 0.2, Math.PI - 0.2);
      } else {
        ctx.arc(0, 13, 4, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    // --- TURBAN ---
    drawTurban(ctx, 0, -24, isWhacked ? mullah.dizzyRotation * 0.1 : 0);

    ctx.restore(); // head translate

    // Threatening indicator
    if (isThreatening) {
      const pulse = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';

      const angrySymbol = Math.sin(frameCount * 0.08) > 0 ? '!!' : '!!!';
      ctx.fillText(angrySymbol, 0, -75);

      // Anger vein symbol (manga style)
      ctx.strokeStyle = '#FF2200';
      ctx.lineWidth = 2.5;
      const vx = 18, vy = -60;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + 6, vy - 4);
      ctx.moveTo(vx + 6, vy);
      ctx.lineTo(vx, vy - 4);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // main translate (includes scale)
  }

  // === RAT CHARACTER ===
  function drawRat(ctx: CanvasRenderingContext2D, hole: Hole, mullah: MullahInHole, frameCount: number) {
    const centerX = hole.x + hole.width / 2;
    const popOffset = 75 * mullah.popProgress;
    const baseY = hole.y - popOffset;

    const isWhacked = mullah.state === MullahState.WHACKED;
    const isThreatening = mullah.state === MullahState.THREATENING;
    const isRetreating = mullah.state === MullahState.RETREATING;

    ctx.save();
    ctx.translate(centerX, baseY);

    const S = 0.75;
    ctx.scale(S, S);

    if (isWhacked) {
      const wobble = Math.sin(mullah.dizzyRotation * 3) * 0.18;
      ctx.rotate(wobble);
    }

    if (isThreatening) {
      const sway = Math.sin(frameCount * 0.08) * 0.05;
      ctx.rotate(sway);
    }

    // --- BODY: Dark blue robe ---
    ctx.fillStyle = '#3A4A6A';
    ctx.beginPath();
    ctx.moveTo(-28, 10);
    ctx.quadraticCurveTo(-35, 45, -30, 80);
    ctx.lineTo(30, 80);
    ctx.quadraticCurveTo(35, 45, 28, 10);
    ctx.closePath();
    ctx.fill();

    const robeSwing = Math.sin(mullah.walkFrame) * 2;
    ctx.fillStyle = '#2A3555';
    ctx.beginPath();
    ctx.moveTo(-22, 60);
    ctx.quadraticCurveTo(robeSwing, 72, 22, 60);
    ctx.lineTo(26, 80);
    ctx.lineTo(-26, 80);
    ctx.closePath();
    ctx.fill();

    // Aba (cloak)
    ctx.fillStyle = '#334060';
    ctx.beginPath();
    ctx.ellipse(0, 22, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar
    ctx.fillStyle = '#4A5A7A';
    ctx.beginPath();
    ctx.ellipse(0, 8, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Robe center line
    ctx.strokeStyle = '#2A3555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, 70);
    ctx.stroke();

    // Long tail poking out from left side, curving down and back up
    ctx.strokeStyle = '#7090C0';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-28, 55);
    ctx.quadraticCurveTo(-44, 48, -50, 35);
    ctx.quadraticCurveTo(-56, 20, -48, 10);
    ctx.quadraticCurveTo(-42, 2, -38, 8);
    ctx.stroke();
    // Tail tip
    ctx.fillStyle = '#8AAAD0';
    ctx.beginPath();
    ctx.arc(-38, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';

    // --- ARMS (same structure, grey colors) ---
    if (isThreatening) {
      const fingerWag = Math.sin(mullah.fingerWagFrame * 2.5) * 6;

      // RIGHT ARM
      ctx.strokeStyle = '#3A4A6A';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(18, 20);
      ctx.quadraticCurveTo(32, 12, 40, 5);
      ctx.stroke();

      ctx.strokeStyle = '#2A3555';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(18, 20);
      ctx.lineTo(24, 16);
      ctx.stroke();

      // Forearm (blue-grey rat skin)
      ctx.strokeStyle = '#7090C0';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(40, 5);
      ctx.lineTo(48, -10 + fingerWag * 0.3);
      ctx.stroke();

      // Hand / fist
      ctx.fillStyle = '#7090C0';
      ctx.beginPath();
      ctx.arc(49, -13 + fingerWag * 0.3, 6, 0, Math.PI * 2);
      ctx.fill();

      // POINTING FINGER
      ctx.strokeStyle = '#7090C0';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(50, -19 + fingerWag * 0.3);
      ctx.lineTo(54, -38 + fingerWag * 0.5);
      ctx.stroke();

      // Finger tip (pinkish claw)
      ctx.fillStyle = '#DDA0A0';
      ctx.beginPath();
      ctx.arc(54, -40 + fingerWag * 0.5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Curled fingers
      ctx.strokeStyle = '#6080B0';
      ctx.lineWidth = 2.5;
      for (let f = -1; f <= 1; f++) {
        ctx.beginPath();
        ctx.arc(49 + f * 2.5, -13 + fingerWag * 0.3, 4, Math.PI * 0.3, Math.PI * 1.2);
        ctx.stroke();
      }

      // LEFT ARM
      ctx.strokeStyle = '#3A4A6A';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-15, 20);
      ctx.quadraticCurveTo(-28, 30, -20, 42);
      ctx.stroke();

      ctx.strokeStyle = '#2A3555';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-15, 20);
      ctx.lineTo(-20, 26);
      ctx.stroke();

      ctx.fillStyle = '#7090C0';
      ctx.beginPath();
      ctx.arc(-20, 44, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#3A4A6A';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-20, 25);
      ctx.quadraticCurveTo(-28, 38, -22, 48);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, 25);
      ctx.quadraticCurveTo(28, 38, 22, 48);
      ctx.stroke();
    }

    ctx.lineCap = 'butt';

    // --- HEAD ---
    ctx.save();
    ctx.translate(0, -15);

    // Rat head (white face)
    ctx.fillStyle = isWhacked ? '#E8E0E0' : '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 3, 20, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large round rat ears (above head, poking up)
    // Left ear
    ctx.fillStyle = '#E0D8D8';
    ctx.beginPath();
    ctx.ellipse(-15, -18, 10, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EAADAD';
    ctx.beginPath();
    ctx.ellipse(-15, -18, 6, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Right ear
    ctx.fillStyle = '#E0D8D8';
    ctx.beginPath();
    ctx.ellipse(15, -18, 10, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EAADAD';
    ctx.beginPath();
    ctx.ellipse(15, -18, 6, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Snout (protruding)
    ctx.fillStyle = isWhacked ? '#E8E0E0' : '#F5F0F0';
    ctx.beginPath();
    ctx.ellipse(0, 10, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pink nose
    ctx.fillStyle = '#E88';
    ctx.beginPath();
    ctx.arc(0, 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FAA';
    ctx.beginPath();
    ctx.arc(-1, 13, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = '#5070A0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, 10); ctx.lineTo(-24, 5);
    ctx.moveTo(-9, 12); ctx.lineTo(-24, 12);
    ctx.moveTo(-9, 14); ctx.lineTo(-24, 19);
    ctx.moveTo(9, 10); ctx.lineTo(24, 5);
    ctx.moveTo(9, 12); ctx.lineTo(24, 12);
    ctx.moveTo(9, 14); ctx.lineTo(24, 19);
    ctx.stroke();

    // White beard (slightly shorter than mullah's)
    ctx.fillStyle = '#F5F5F5';
    ctx.beginPath();
    ctx.moveTo(-12, 14);
    ctx.quadraticCurveTo(-16, 22, -10, 30);
    ctx.quadraticCurveTo(0, 35, 10, 30);
    ctx.quadraticCurveTo(16, 22, 12, 14);
    ctx.quadraticCurveTo(0, 18, -12, 14);
    ctx.fill();

    // Beard texture
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 1;
    for (let bi = -8; bi <= 8; bi += 4) {
      ctx.beginPath();
      ctx.moveTo(bi, 16);
      ctx.quadraticCurveTo(bi + 1, 24, bi, 29);
      ctx.stroke();
    }

    // --- EYES AND GLASSES ---
    if (isWhacked) {
      // Dizzy spiral eyes
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      for (let s = 0; s < 2; s++) {
        ctx.beginPath();
        const spiralOffset = mullah.dizzyRotation + s * Math.PI;
        for (let t = 0; t < 8; t++) {
          const angle = spiralOffset + t * 0.8;
          const radius = t * 0.8;
          const sx = -8 + Math.cos(angle) * radius;
          const sy = -1 + Math.sin(angle) * radius;
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      for (let s = 0; s < 2; s++) {
        ctx.beginPath();
        const spiralOffset = -mullah.dizzyRotation + s * Math.PI;
        for (let t = 0; t < 8; t++) {
          const angle = spiralOffset + t * 0.8;
          const radius = t * 0.8;
          const sx = 8 + Math.cos(angle) * radius;
          const sy = -1 + Math.sin(angle) * radius;
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Broken glasses
      ctx.strokeStyle = '#B8961E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-8, -1, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-11, -4); ctx.lineTo(-5, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(8, -1, 7, 6, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1, -1); ctx.lineTo(1, -2);
      ctx.stroke();

      // Dazed mouth
      ctx.strokeStyle = '#5070A0';
      ctx.lineWidth = 2;
      const mouthWobble = Math.sin(mullah.dizzyRotation * 2) * 3;
      ctx.beginPath();
      ctx.moveTo(-5, 18 + mouthWobble);
      ctx.quadraticCurveTo(0, 22 - mouthWobble, 5, 18 + mouthWobble);
      ctx.stroke();

      // Dizzy stars
      const starColors = ['#FFD700', '#FFA500', '#FF6347'];
      for (let si = 0; si < 3; si++) {
        const starAngle = mullah.stars * 3 + (si * Math.PI * 2) / 3;
        const starRadius = 30;
        const sx = Math.cos(starAngle) * starRadius;
        const sy = -20 + Math.sin(starAngle) * 10;
        ctx.fillStyle = starColors[si];
        drawStar(ctx, sx, sy, 5, 5, 2.5);
      }

      // Red bump
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.arc(5, -22, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF6666';
      ctx.beginPath();
      ctx.arc(4, -24, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (isThreatening) {
      // Angry rat face (red pulse over white)
      const angerPulse = 0.25 + Math.sin(frameCount * 0.15) * 0.1;
      ctx.fillStyle = `rgba(200, 40, 40, ${angerPulse})`;
      ctx.beginPath();
      ctx.ellipse(0, 3, 20, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Angry eye whites
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(-8, -2, 5, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -2, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red pupils (beady, mean)
      ctx.fillStyle = '#CC0000';
      const eyeShift = Math.sin(frameCount * 0.12) * 1.5;
      ctx.beginPath();
      ctx.arc(-8 + eyeShift, -1.5, 2.5, 0, Math.PI * 2);
      ctx.arc(8 + eyeShift, -1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Glasses (gold frame)
      ctx.strokeStyle = '#B8961E';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-8, -2, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, -2, 7, 0, Math.PI * 2);
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(-1, -2);
      ctx.lineTo(1, -2);
      ctx.stroke();
      // Temple arms
      ctx.beginPath();
      ctx.moveTo(-15, -2); ctx.lineTo(-20, 1);
      ctx.moveTo(15, -2); ctx.lineTo(20, 1);
      ctx.stroke();

      // Angry eyebrows
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-15, -12); ctx.lineTo(-3, -6);
      ctx.moveTo(15, -12); ctx.lineTo(3, -6);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Baring teeth (rat front teeth)
      ctx.fillStyle = '#3A0808';
      ctx.beginPath();
      ctx.ellipse(0, 18, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two big front teeth
      ctx.fillStyle = '#FFFFCC';
      ctx.fillRect(-3, 15, 3, 5);
      ctx.fillRect(1, 15, 3, 5);
      ctx.strokeStyle = '#DDD';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-3, 15, 3, 5);
      ctx.strokeRect(1, 15, 3, 5);

    } else {
      // Default face (rising/retreating)
      // Eyes
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(-8, -2, 4, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -2, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-7, -2, 2, 0, Math.PI * 2);
      ctx.arc(9, -2, 2, 0, Math.PI * 2);
      ctx.fill();

      // Glasses
      ctx.strokeStyle = '#B8961E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-8, -2, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, -2, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1, -2); ctx.lineTo(1, -2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-15, -2); ctx.lineTo(-20, 1);
      ctx.moveTo(15, -2); ctx.lineTo(20, 1);
      ctx.stroke();

      // Eyebrows
      ctx.strokeStyle = '#405880';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-13, -9); ctx.lineTo(-3, -7);
      ctx.moveTo(13, -9); ctx.lineTo(3, -7);
      ctx.stroke();

      // Mouth
      ctx.strokeStyle = '#5070A0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (isRetreating) {
        ctx.arc(0, 16, 4, 0.2, Math.PI - 0.2);
      } else {
        ctx.arc(0, 17, 3, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    // --- TURBAN (same white turban as mullah) ---
    drawTurban(ctx, 0, -26, isWhacked ? mullah.dizzyRotation * 0.1 : 0);

    ctx.restore(); // head translate

    // "2x" point badge (golden glow)
    if (!isWhacked) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('x2', 0, -80);
      ctx.textAlign = 'left';
    }

    // Threatening indicator
    if (isThreatening) {
      const pulse = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';

      const angrySymbol = Math.sin(frameCount * 0.08) > 0 ? '!!' : '!!!';
      ctx.fillText(angrySymbol, 0, -92);

      ctx.strokeStyle = '#FF2200';
      ctx.lineWidth = 2.5;
      const vx = 18, vy = -78;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + 6, vy - 4);
      ctx.moveTo(vx + 6, vy);
      ctx.lineTo(vx, vy - 4);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // main translate (includes scale)
  }

  function drawTurban(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    const w = 44;
    const h = 30;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.ellipse(2, 5, w / 2.2, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -h / 5, w / 2.5, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -h / 8, w / 2.5, h / 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, h / 10, w / 2.3, h / 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#D8D8D8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 4, -h / 4);
    ctx.quadraticCurveTo(0, -h / 8, w / 4, -h / 5);
    ctx.stroke();

    ctx.fillStyle = '#F5F5F5';
    ctx.beginPath();
    ctx.moveTo(w / 4, -h / 6);
    ctx.quadraticCurveTo(w / 3 + 4, h / 8, w / 4, h / 3);
    ctx.quadraticCurveTo(w / 6, h / 5, w / 4, -h / 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-w / 6, -h / 4, w / 6, h / 10, -0.3, 0, Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2.8, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  function drawHUD(ctx: CanvasRenderingContext2D, config: GameConfig, data: ReturnType<GameEngine['getData']>, frameCount: number) {
    const canvasWidth = config.canvasWidth;

    // Score panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 150, 80, 10);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`${data.score}`, 25, 44);
    ctx.font = '13px Arial';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Best: ${data.highScore}`, 25, 62);

    if (data.combo > 1) {
      ctx.fillStyle = '#FF6B35';
      ctx.font = 'bold 15px Arial';
      ctx.fillText(`Combo x${data.combo}!`, 25, 80);
    } else {
      ctx.fillStyle = '#888';
      ctx.font = '13px Arial';
      ctx.fillText(`Level ${data.difficulty + 1}`, 25, 80);
    }

    // Timer panel
    const timeSeconds = Math.ceil(data.timeRemaining / 60);
    const timeRatio = data.timeRemaining / (20 * 60);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(canvasWidth - 160, 10, 150, 55, 10);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(canvasWidth - 145, 42, 120, 12, 4);
    ctx.fill();

    const timerColor = timeRatio > 0.3 ? '#4ECDC4' : (timeRatio > 0.15 ? '#FFD700' : '#FF4444');
    ctx.fillStyle = timerColor;
    ctx.beginPath();
    ctx.roundRect(canvasWidth - 145, 42, 120 * timeRatio, 12, 4);
    ctx.fill();

    if (timeSeconds <= 10) {
      const urgency = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 68, 68, ${urgency})`;
      ctx.font = 'bold 22px Arial';
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Arial';
    }
    ctx.fillText(`${timeSeconds}s`, canvasWidth - 145, 37);

    // Instructions hint
    if (data.timeRemaining > 17 * 60) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px Arial';
      ctx.fillText('Click or tap to whack!', canvasWidth / 2, config.canvasHeight - 15);
      ctx.textAlign = 'left';
    }
  }

  function drawParticles(ctx: CanvasRenderingContext2D, particles: ScoreParticle[]) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y += p.vy;
      p.vy -= 0.05;
      p.alpha -= 0.015;
      p.scale += 0.005;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.font = `bold ${Math.floor(20 * p.scale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  function drawMullahIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, S: number, frameCount: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(S, S);

    // Slight angry sway
    const sway = Math.sin(frameCount * 0.06) * 0.04;
    ctx.rotate(sway);

    // Brown robe/shoulders
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.moveTo(-32, 18);
    ctx.quadraticCurveTo(-42, 50, -38, 70);
    ctx.lineTo(38, 70);
    ctx.quadraticCurveTo(42, 50, 32, 18);
    ctx.closePath();
    ctx.fill();

    // Aba drape
    ctx.fillStyle = '#7A5B10';
    ctx.beginPath();
    ctx.ellipse(0, 28, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Robe hem detail
    ctx.fillStyle = '#6B4E0E';
    ctx.beginPath();
    ctx.moveTo(-26, 58);
    const robeSwing = Math.sin(frameCount * 0.04) * 2;
    ctx.quadraticCurveTo(robeSwing, 68, 26, 58);
    ctx.lineTo(30, 70);
    ctx.lineTo(-30, 70);
    ctx.closePath();
    ctx.fill();

    // Collar
    ctx.fillStyle = '#9C8B75';
    ctx.beginPath();
    ctx.ellipse(0, 10, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // LEFT ARM - clenched at side
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, 22);
    ctx.quadraticCurveTo(-32, 32, -24, 46);
    ctx.stroke();
    // Sleeve
    ctx.strokeStyle = '#7A5B10';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-18, 22);
    ctx.lineTo(-22, 28);
    ctx.stroke();
    // Fist
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(-24, 48, 6, 0, Math.PI * 2);
    ctx.fill();

    // RIGHT ARM - raised high, wagging finger prominently
    const fingerWag = Math.sin(frameCount * 0.1) * 10;

    // Upper arm from right shoulder going up-right
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.quadraticCurveTo(36, 8, 42, -5);
    ctx.stroke();

    // Sleeve
    ctx.strokeStyle = '#7A5B10';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(26, 14);
    ctx.stroke();

    // Forearm going up
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(42, -5);
    ctx.lineTo(50, -20 + fingerWag * 0.2);
    ctx.stroke();

    // Fist
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(51, -23 + fingerWag * 0.2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Curled fingers on fist
    ctx.strokeStyle = '#D4AA78';
    ctx.lineWidth = 2.5;
    for (let f = -1; f <= 1; f++) {
      ctx.beginPath();
      ctx.arc(51 + f * 3, -23 + fingerWag * 0.2, 5, Math.PI * 0.3, Math.PI * 1.2);
      ctx.stroke();
    }

    // POINTING FINGER - big and clear
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(52, -30 + fingerWag * 0.2);
    ctx.lineTo(56, -52 + fingerWag * 0.5);
    ctx.stroke();

    // Finger tip - larger
    ctx.fillStyle = '#DEBA87';
    ctx.beginPath();
    ctx.arc(56, -55 + fingerWag * 0.5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'butt';

    // Head
    ctx.save();
    ctx.translate(0, -12);

    // Angry red tint pulse
    const angerPulse = 0.2 + Math.sin(frameCount * 0.12) * 0.08;

    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    // Red anger overlay
    ctx.fillStyle = `rgba(180, 30, 30, ${angerPulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#D4AA78';
    ctx.beginPath();
    ctx.ellipse(-25, 2, 5, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(25, 2, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // White beard
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.moveTo(-18, 8);
    ctx.quadraticCurveTo(-24, 26, -15, 42);
    ctx.quadraticCurveTo(0, 50, 15, 42);
    ctx.quadraticCurveTo(24, 26, 18, 8);
    ctx.quadraticCurveTo(0, 16, -18, 8);
    ctx.fill();
    ctx.strokeStyle = '#D8D8D8';
    ctx.lineWidth = 1;
    for (let bi = -12; bi <= 12; bi += 4) {
      ctx.beginPath();
      ctx.moveTo(bi, 14);
      ctx.quadraticCurveTo(bi + 1, 30, bi, 40);
      ctx.stroke();
    }

    // Nose
    ctx.fillStyle = '#C9A66B';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(-5, 3, -3, 8);
    ctx.quadraticCurveTo(0, 10, 3, 8);
    ctx.quadraticCurveTo(5, 3, 0, -4);
    ctx.fill();

    // Veins on forehead
    ctx.strokeStyle = 'rgba(180, 50, 50, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.quadraticCurveTo(-5, -22, -2, -18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, -19);
    ctx.quadraticCurveTo(8, -23, 10, -18);
    ctx.stroke();

    // Wide angry eyes - bloodshot whites
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(-9, -2, 7, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -2, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bloodshot veins
    ctx.strokeStyle = 'rgba(200, 40, 40, 0.4)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-15, -3); ctx.lineTo(-12, -2);
    ctx.moveTo(-15, -1); ctx.lineTo(-12, 0);
    ctx.moveTo(15, -3); ctx.lineTo(12, -2);
    ctx.moveTo(15, -1); ctx.lineTo(12, 0);
    ctx.stroke();

    // Angry pupils
    ctx.fillStyle = '#000';
    const eyeShift = Math.sin(frameCount * 0.1) * 1.5;
    ctx.beginPath();
    ctx.arc(-9 + eyeShift, -1, 3, 0, Math.PI * 2);
    ctx.arc(9 + eyeShift, -1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Red eye glint
    ctx.fillStyle = 'rgba(255, 50, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(-9 + eyeShift + 1, -2.5, 1.2, 0, Math.PI * 2);
    ctx.arc(9 + eyeShift + 1, -2.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Heavy angry eyebrows - V-shaped
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-17, -12);
    ctx.lineTo(-4, -4);
    ctx.moveTo(17, -12);
    ctx.lineTo(4, -4);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Brow wrinkles
    ctx.strokeStyle = '#B8976A';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -14); ctx.lineTo(6, -14);
    ctx.moveTo(-4, -16); ctx.lineTo(4, -16);
    ctx.stroke();

    // Shouting mouth
    ctx.fillStyle = '#3A0808';
    ctx.beginPath();
    ctx.ellipse(0, 14, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EEEEEE';
    ctx.fillRect(-5, 10, 3, 3);
    ctx.fillRect(-1, 10, 3, 3);
    ctx.fillRect(3, 10, 3, 3);
    ctx.fillRect(-4, 16, 3, 2);
    ctx.fillRect(1, 16, 3, 2);
    ctx.strokeStyle = '#5C0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 14, 7, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // White turban
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, -22, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -28, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -24, 26, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-8, -32, 10, 5, -0.3, 0, Math.PI);
    ctx.fill();

    ctx.restore(); // head

    ctx.restore(); // main
  }

  function drawStartOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, frameCount: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';

    const isSmall = width < 500;

    // Title at top
    const titleSize = isSmall ? 32 : 50;
    const titleY = isSmall ? height * 0.10 : height * 0.12;
    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FF4400';
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText('WHACK-A-MULLAH', width / 2, titleY);
    ctx.shadowBlur = 0;

    // Farsi title
    ctx.fillStyle = '#E8DCC8';
    ctx.font = `${isSmall ? 18 : 24}px Arial`;
    ctx.fillText('\u0628\u0632\u0646 \u062A\u0648 \u0633\u0631 \u0622\u062E\u0648\u0646\u062F\u0647', width / 2, titleY + (isSmall ? 28 : 36));

    // Subtitle
    ctx.fillStyle = '#AAAAAA';
    ctx.font = `${isSmall ? 12 : 14}px Arial`;
    ctx.fillText('Smack that threatening finger down!', width / 2, titleY + (isSmall ? 48 : 60));

    // Angry mullah icon - large and centered
    const iconY = height / 2 + (isSmall ? 15 : 5);
    const iconScale = isSmall ? 1.3 : 1.6;
    drawMullahIcon(ctx, width / 2, iconY, iconScale, frameCount);

    // Pulsing start prompt at bottom
    const promptY = isSmall ? height - 50 : height - 40;
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${isSmall ? 22 : 26}px Arial`;
    const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('Click or Tap to Start', width / 2, promptY);
    ctx.globalAlpha = 1;

    // Version number
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#888888';
    ctx.font = '11px Arial';
    ctx.fillText('v0.2', width / 2, height - 12);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
  }

  function drawConfetti(ctx: CanvasRenderingContext2D, particles: ConfettiParticle[], canvasHeight: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.vy += 0.04;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.vx *= 0.995;

      if (p.y > canvasHeight + 20) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  function drawDizzyMullahLarge(ctx: CanvasRenderingContext2D, cx: number, cy: number, frameCount: number, whacks: number) {
    ctx.save();
    ctx.translate(cx, cy);

    const wobble = Math.sin(frameCount * 0.06) * 0.08;
    ctx.rotate(wobble);

    const S = 1.1;
    ctx.scale(S, S);

    // Robe
    ctx.fillStyle = '#A67C52';
    ctx.beginPath();
    ctx.moveTo(-28, 10);
    ctx.quadraticCurveTo(-35, 45, -30, 60);
    ctx.lineTo(30, 60);
    ctx.quadraticCurveTo(35, 45, 28, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.ellipse(0, 22, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9C8B75';
    ctx.beginPath();
    ctx.ellipse(0, 8, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.save();
    ctx.translate(0, -15);
    ctx.fillStyle = '#E8C8A0';
    ctx.beginPath();
    ctx.arc(0, 5, 22, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.ellipse(-22, 5, 5, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 5, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beard
    ctx.fillStyle = '#F5F5F5';
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.quadraticCurveTo(-20, 23, -13, 36);
    ctx.quadraticCurveTo(0, 43, 13, 36);
    ctx.quadraticCurveTo(20, 23, 16, 10);
    ctx.quadraticCurveTo(0, 16, -16, 10);
    ctx.fill();
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 1;
    for (let bi = -10; bi <= 10; bi += 4) {
      ctx.beginPath();
      ctx.moveTo(bi, 14);
      ctx.quadraticCurveTo(bi + 1, 26, bi, 34);
      ctx.stroke();
    }

    // Nose
    ctx.fillStyle = '#C9A66B';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(-5, 4, -3, 9);
    ctx.quadraticCurveTo(0, 11, 3, 9);
    ctx.quadraticCurveTo(5, 4, 0, -2);
    ctx.fill();

    // Spiral dizzy eyes
    const dizzyRot = frameCount * 0.04;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    for (let s = 0; s < 2; s++) {
      ctx.beginPath();
      const so = dizzyRot + s * Math.PI;
      for (let t = 0; t < 8; t++) {
        const a = so + t * 0.8, r = t * 0.8;
        const sx = -8 + Math.cos(a) * r, sy = Math.sin(a) * r;
        if (t === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    for (let s = 0; s < 2; s++) {
      ctx.beginPath();
      const so = -dizzyRot + s * Math.PI;
      for (let t = 0; t < 8; t++) {
        const a = so + t * 0.8, r = t * 0.8;
        const sx = 8 + Math.cos(a) * r, sy = Math.sin(a) * r;
        if (t === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Dazed mouth
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    const mw = Math.sin(dizzyRot * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(-6, 14 + mw);
    ctx.quadraticCurveTo(0, 18 - mw, 6, 14 + mw);
    ctx.stroke();

    // Stars
    const starColors = ['#FFD700', '#FFA500', '#FF6347'];
    for (let si = 0; si < 3; si++) {
      const sa = dizzyRot * 3 + (si * Math.PI * 2) / 3;
      ctx.fillStyle = starColors[si];
      drawStar(ctx, Math.cos(sa) * 30, -20 + Math.sin(sa) * 10, 5, 5, 2.5);
    }

    // Bump
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(5, -22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF6666';
    ctx.beginPath();
    ctx.arc(4, -24, 3, 0, Math.PI * 2);
    ctx.fill();

    // Turban
    drawTurban(ctx, 0, -24, Math.sin(dizzyRot) * 0.1);
    ctx.restore(); // head

    // Whack count badge
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(-22, 62, 44, 20, 8);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${whacks}x`, 0, 76);
    ctx.textAlign = 'left';

    ctx.restore(); // main
  }

  function drawGameOverOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, data: ReturnType<GameEngine['getData']>, frameCount: number, confetti: ConfettiParticle[]) {
    const isSmall = width < 500;
    // Dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, width, height);

    // Confetti
    drawConfetti(ctx, confetti, height);

    // Slowly add more confetti
    if (confetti.length < 60 && Math.random() < 0.3) {
      confetti.push({
        x: Math.random() * width,
        y: -10,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 1.5 + 0.5,
        color: ['#FF0000', '#FFD700', '#00CC00', '#0088FF', '#FF6600', '#CC00FF'][Math.floor(Math.random() * 6)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 5 + 2,
      });
    }

    ctx.textAlign = 'center';

    // Layout anchors
    const titleY = isSmall ? height * 0.08 : height * 0.1;
    const mullahY = isSmall ? height * 0.28 : height * 0.3;
    const scoreY = isSmall ? height * 0.56 : height * 0.62;

    // "TIME'S UP!" title
    const titleSize = isSmall ? 34 : 52;
    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText("TIME'S UP!", width / 2, titleY);
    ctx.shadowBlur = 0;

    // Dizzy mullah
    drawDizzyMullahLarge(ctx, width / 2, mullahY, frameCount, data.whacks);

    // Big score
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${isSmall ? 42 : 56}px Arial`;
    ctx.fillText(`${data.score}`, width / 2, scoreY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#CCCCCC';
    ctx.font = '14px Arial';
    ctx.fillText('POINTS', width / 2, scoreY + 18);

    // Stats line
    ctx.font = '15px Arial';
    ctx.fillStyle = '#BBBBBB';
    ctx.fillText(`Max Combo: x${data.maxCombo}`, width / 2, scoreY + 40);

    // High score line (separate from combo)
    if (data.score >= data.highScore && data.score > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 17px Arial';
      const sparkle = Math.sin(frameCount * 0.1) > 0 ? ' *' : '* ';
      ctx.fillText(`${sparkle} NEW HIGH SCORE! ${sparkle}`, width / 2, scoreY + 62);
    } else {
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.fillText(`Best: ${data.highScore}`, width / 2, scoreY + 62);
    }

    // Play Again button
    const btn = getPlayAgainRect(width, height);
    const btnHover = Math.sin(frameCount * 0.06) * 0.15 + 0.85;

    // Button glow
    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = 12 * btnHover;
    ctx.fillStyle = '#CC3300';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Button face
    const btnGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    btnGrad.addColorStop(0, '#FF5533');
    btnGrad.addColorStop(1, '#CC3300');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(btn.x + 2, btn.y + 2, btn.w - 4, btn.h - 4, 10);
    ctx.fill();

    // Button text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('PLAY AGAIN', width / 2, btn.y + 33);

    ctx.textAlign = 'left';
  }

  // Sound trigger helper - track state changes for all mullahs
  function checkSoundTriggers(data: ReturnType<GameEngine['getData']>, sound: SoundEngine) {
    const prevStates = prevMullahStatesRef.current;

    for (let i = 0; i < data.mullahs.length; i++) {
      const mullah = data.mullahs[i];
      const prevState = prevStates.get(i);

      if (prevState !== undefined && mullah.state !== prevState) {
        if (mullah.state === MullahState.RISING && prevState === MullahState.HIDDEN) {
          sound.playPopUp();
        }
        // Whack/squeak/combo sounds are played directly in the gesture handler
        // for mobile compatibility - don't duplicate them here
        if (mullah.state === MullahState.RETREATING) {
          sound.playRetreat();
        }
      }

      prevStates.set(i, mullah.state);
    }

    // Countdown beeps
    if (data.state === GameState.PLAYING) {
      const sec = Math.ceil(data.timeRemaining / 60);
      if (sec <= 5 && sec !== lastCountdownSecRef.current && sec > 0) {
        sound.playCountdown();
        lastCountdownSecRef.current = sec;
      }
    }
  }

  // Game loop effect - restarts when orientation changes
  useEffect(() => {
    if (isPortrait === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentConfig = isPortrait ? PORTRAIT_CONFIG : DEFAULT_CONFIG;
    canvas.width = currentConfig.canvasWidth;
    canvas.height = currentConfig.canvasHeight;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    engineRef.current = new GameEngine(currentConfig);
    if (!soundRef.current) {
      soundRef.current = new SoundEngine();
    }
    lastFrameTimeRef.current = performance.now();
    prevMullahStatesRef.current = new Map();
    lastCountdownSecRef.current = -1;
    particlesRef.current = [];

    let gameOverSoundPlayed = false;
    let accumulator = 0;

    const gameLoop = (currentTime: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Clamp delta to avoid spiral of death (e.g. tab was backgrounded)
      accumulator += Math.min(deltaTime, FRAME_TIME * 5);

      let updated = false;
      while (accumulator >= FRAME_TIME) {
        accumulator -= FRAME_TIME;
        frameCountRef.current++;

        const prevState = engine.getData().state;
        engine.update();
        const data = engine.getData();
        updated = true;

        if (soundRef.current) {
          checkSoundTriggers(data, soundRef.current);

          if (data.state === GameState.GAMEOVER && prevState === GameState.PLAYING && !gameOverSoundPlayed) {
            soundRef.current.playGameOver();
            gameOverSoundPlayed = true;
            confettiRef.current = spawnConfetti(currentConfig.canvasWidth);
          }
          if (data.state === GameState.PLAYING) {
            gameOverSoundPlayed = false;
          }
        }
      }

      if (updated) {
        draw(ctx, engine, frameCountRef.current);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPortrait, draw]);

  // Click/touch input handlers
  useEffect(() => {
    if (isPortrait === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const handleInteraction = (clientX: number, clientY: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Unlock audio on user gesture (required for mobile)
      soundRef.current?.unlock();

      const { x, y } = getCanvasCoords(clientX, clientY);
      const data = engine.getData();
      const config = engine.getConfig();

      // Game over: only restart when clicking the Play Again button
      if (data.state === GameState.GAMEOVER) {
        const btn = getPlayAgainRect(config.canvasWidth, config.canvasHeight);
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          engine.startGame();
          confettiRef.current = [];
          particlesRef.current = [];
        }
        return;
      }

      const hitIndex = engine.handleWhack(x, y);

      if (hitIndex >= 0) {
        const mullah = data.mullahs[hitIndex];
        const hole = config.holes[mullah.holeIndex];
        spawnHitParticle(hole.x + hole.width / 2, hole.y - 45, data.combo, mullah.isRat);
        // Play sounds directly in the gesture handler for mobile compatibility
        soundRef.current?.playWhack();
        if (mullah.isRat) {
          setTimeout(() => soundRef.current?.playSqueak(), 80);
        }
        if (data.combo > 1) {
          setTimeout(() => soundRef.current?.playCombo(), 100);
        }
      } else if (data.state === GameState.PLAYING) {
        soundRef.current?.playMiss();
      }
    };

    const handleClick = (e: MouseEvent) => {
      handleInteraction(e.clientX, e.clientY);
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, [isPortrait]);

  function spawnHitParticle(x: number, y: number, combo: number, isRat: boolean) {
    const comboBonus = Math.min(combo - 1, 5);
    const basePoints = isRat ? 2 : 1;
    const points = basePoints + comboBonus;
    const text = isRat
      ? (combo > 1 ? `+${points} Moosh Ali x${combo}` : `+${points} Moosh Ali!`)
      : (combo > 1 ? `+${points} x${combo}` : `+${points}`);
    const color = isRat ? '#44DDFF' : (combo > 3 ? '#FF4400' : combo > 1 ? '#FF6B35' : '#FFD700');

    particlesRef.current.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      vy: -2,
      text,
      color,
      alpha: 1,
      scale: isRat ? 1.3 : (combo > 3 ? 1.3 : 1),
    });
  }

  // Don't render until orientation is detected (avoids flash)
  if (isPortrait === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <canvas
        ref={canvasRef}
        width={isPortrait ? 400 : 800}
        height={isPortrait ? 700 : 400}
        className="border-4 border-gray-700 rounded-lg shadow-2xl cursor-pointer max-w-full"
        style={{ imageRendering: 'auto' }}
      />
      <p className="text-gray-400 mt-4 text-sm">
        Click or tap the mullah when he pops up!
      </p>
      <a
        href="https://github.com/sohei1l"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-500 hover:text-gray-300 mt-6 text-xs transition-colors"
      >
        Made by @sohei1l
      </a>
    </div>
  );
}
