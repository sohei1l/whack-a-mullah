'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '@/lib/gameEngine';
import { GameState, MullahState, Hole, MullahInHole, HOLE_LAYOUT } from '@/lib/gameTypes';

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// Web Audio sound synthesizer
class SoundEngine {
  private ctx: AudioContext | null = null;

  // Must be called directly inside a user gesture (click/touchstart) to unlock audio on mobile
  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
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

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const soundRef = useRef<SoundEngine | null>(null);
  const particlesRef = useRef<ScoreParticle[]>([]);
  const prevMullahStatesRef = useRef<Map<number, MullahState>>(new Map());
  const lastCountdownSecRef = useRef<number>(-1);

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
    const gradient = ctx.createLinearGradient(0, 0, 0, config.canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.4, '#B8D4E3');
    gradient.addColorStop(0.5, '#D2B48C');
    gradient.addColorStop(1, '#8B7355');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Desert ground
    ctx.fillStyle = '#C9A96E';
    ctx.fillRect(0, config.canvasHeight * 0.35, config.canvasWidth, config.canvasHeight * 0.65);

    // Ground texture lines
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < config.canvasWidth; i += 60) {
      ctx.moveTo(i + Math.sin(i * 0.1) * 10, config.canvasHeight * 0.35);
      ctx.lineTo(i + 20, config.canvasHeight);
    }
    ctx.stroke();

    // Distant dunes
    ctx.fillStyle = '#D4B896';
    ctx.beginPath();
    ctx.moveTo(0, config.canvasHeight * 0.38);
    for (let i = 0; i <= config.canvasWidth; i += 50) {
      ctx.lineTo(i, config.canvasHeight * 0.35 + Math.sin(i * 0.008 + 1) * 12);
    }
    ctx.lineTo(config.canvasWidth, config.canvasHeight * 0.4);
    ctx.lineTo(0, config.canvasHeight * 0.4);
    ctx.closePath();
    ctx.fill();

    // === WOODEN TABLE ===
    const tableX = 60, tableY = 130, tableW = 680, tableH = 240;
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
        const shimmerY = 100 + Math.sin(frameCount * 0.03 + i * 2) * 5;
        ctx.beginPath();
        ctx.ellipse(shimmerX, shimmerY, 50, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw holes and mullahs
    if (data.state === GameState.PLAYING || data.state === GameState.GAMEOVER) {
      drawHoles(ctx, config.holes, data, frameCount);
      drawHUD(ctx, config.canvasWidth, data, frameCount);
      drawParticles(ctx, particlesRef.current);
    }

    ctx.restore();

    // Draw overlays (outside shake transform)
    if (data.state === GameState.START) {
      drawStartOverlay(ctx, config.canvasWidth, config.canvasHeight, frameCount);
    } else if (data.state === GameState.GAMEOVER) {
      drawGameOverOverlay(ctx, config.canvasWidth, config.canvasHeight, data, frameCount);
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

      // Draw any mullah in this hole
      const mullahInThisHole = data.mullahs.find(m => m.holeIndex === i && m.popProgress > 0);
      if (mullahInThisHole) {
        // Clip region - wider to show finger extending to the right side
        ctx.save();
        ctx.beginPath();
        ctx.rect(hole.x - 25, 0, hole.width + 65, hole.y + hole.height / 2);
        ctx.clip();

        drawMullah(ctx, hole, mullahInThisHole, frameCount);

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

  function drawHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, data: ReturnType<GameEngine['getData']>, frameCount: number) {
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
    const timeRatio = data.timeRemaining / (60 * 60);

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
    if (data.timeRemaining > 57 * 60) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px Arial';
      ctx.fillText('Click or tap the mullah to whack him!', canvasWidth / 2, 385);
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

  function drawStartOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, frameCount: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';

    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FF4400';
    ctx.font = 'bold 52px Arial';
    ctx.fillText('WHACK-A-MULLAH', width / 2, height / 2 - 100);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#E8DCC8';
    ctx.font = '22px Arial';
    ctx.fillText('Smack that threatening finger down!', width / 2, height / 2 - 55);

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px Arial';
    ctx.fillText('The mullah pops up from holes pointing his finger', width / 2, height / 2 - 10);
    ctx.fillText('Click or tap him before he retreats!', width / 2, height / 2 + 15);
    ctx.fillText('Build combos for bonus points. You have 60 seconds!', width / 2, height / 2 + 40);

    // Decorative mullah preview
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 + 85, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2 + 68, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(width / 2 - 6, height / 2 + 83, 2, 0, Math.PI * 2);
    ctx.arc(width / 2 + 6, height / 2 + 83, 2, 0, Math.PI * 2);
    ctx.fill();
    // Mini finger pointing to the right side
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2 + 16, height / 2 + 82);
    ctx.lineTo(width / 2 + 30, height / 2 + 70);
    ctx.stroke();
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(width / 2 + 31, height / 2 + 68, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px Arial';
    const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('Click or Tap to Start', width / 2, height / 2 + 145);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
  }

  function drawGameOverOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, data: ReturnType<GameEngine['getData']>, frameCount: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(150, 0, 0, 0.6)';
    ctx.fillRect(0, height / 2 - 100, width, 200);
    ctx.fillStyle = 'rgba(60, 0, 0, 0.8)';
    ctx.fillRect(0, height / 2 - 60, width, 120);

    ctx.textAlign = 'center';

    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px Arial';
    ctx.fillText("TIME'S UP!", width / 2, height / 2 - 15);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`Score: ${data.score}`, width / 2, height / 2 + 30);

    ctx.fillStyle = '#CCCCCC';
    ctx.font = '18px Arial';
    ctx.fillText(`Max Combo: x${data.maxCombo}`, width / 2, height / 2 + 60);

    if (data.score >= data.highScore && data.score > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 22px Arial';
      const sparkle = Math.sin(frameCount * 0.1) > 0 ? ' *' : '* ';
      ctx.fillText(`${sparkle} NEW HIGH SCORE! ${sparkle}`, width / 2, height / 2 + 95);
    } else {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '18px Arial';
      ctx.fillText(`Best: ${data.highScore}`, width / 2, height / 2 + 95);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('Click or Tap to Play Again', width / 2, height / 2 + 140);
    ctx.globalAlpha = 1;

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
        if (mullah.state === MullahState.WHACKED) {
          sound.playWhack();
          if (data.combo > 1) {
            setTimeout(() => sound.playCombo(), 100);
          }
        }
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    engineRef.current = new GameEngine();
    soundRef.current = new SoundEngine();
    lastFrameTimeRef.current = performance.now();

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
  }, [draw]);

  useEffect(() => {
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

    const handleClick = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Unlock audio on user gesture (required for mobile)
      soundRef.current?.unlock();

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const data = engine.getData();
      const hitIndex = engine.handleWhack(x, y);

      if (hitIndex >= 0) {
        const mullah = data.mullahs[hitIndex];
        const hole = HOLE_LAYOUT[mullah.holeIndex];
        spawnHitParticle(hole.x + hole.width / 2, hole.y - 45, data.combo);
      } else if (data.state === GameState.PLAYING) {
        soundRef.current?.playMiss();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const engine = engineRef.current;
      if (!engine) return;

      // Unlock audio on user gesture (required for mobile)
      soundRef.current?.unlock();

      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      const data = engine.getData();
      const hitIndex = engine.handleWhack(x, y);

      if (hitIndex >= 0) {
        const mullah = data.mullahs[hitIndex];
        const hole = HOLE_LAYOUT[mullah.holeIndex];
        spawnHitParticle(hole.x + hole.width / 2, hole.y - 45, data.combo);
      } else if (data.state === GameState.PLAYING) {
        soundRef.current?.playMiss();
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  function spawnHitParticle(x: number, y: number, combo: number) {
    const comboBonus = Math.min(combo - 1, 5);
    const points = 1 + comboBonus;
    const text = combo > 1 ? `+${points} x${combo}` : `+${points}`;
    const color = combo > 3 ? '#FF4400' : combo > 1 ? '#FF6B35' : '#FFD700';

    particlesRef.current.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      vy: -2,
      text,
      color,
      alpha: 1,
      scale: combo > 3 ? 1.3 : 1,
    });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
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
