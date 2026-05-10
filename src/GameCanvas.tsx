import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameStatus } from './types';

type GameCanvasProps = {
  wristControl: number;
  liftSignal: number;
  calibrated: boolean;
  status: GameStatus;
  resetSignal: number;
  onStatusChange: (status: GameStatus) => void;
  onScoreChange: (score: number) => void;
};

type Pipe = {
  x: number;
  gapY: number;
  passed: boolean;
};

type GameWorld = {
  birdY: number;
  birdVelocity: number;
  pipes: Pipe[];
  score: number;
  frame: number;
};

const WIDTH = 720;
const HEIGHT = 480;
const BIRD_X = 150;
const BIRD_RADIUS = 18;
const PIPE_WIDTH = 72;
const GAP_HEIGHT = 150;
const PIPE_SPACING = 240;
const PIPE_SPEED = 2.5;
const GRAVITY = 0.2;
const FLAP_IMPULSE = 5.7;
const GLIDE_DAMPING = 0.99;
const START_GRACE_FRAMES = 45;

function makeInitialWorld(): GameWorld {
  return {
    birdY: HEIGHT / 2,
    birdVelocity: 0,
    pipes: [
      { x: WIDTH + 80, gapY: 210, passed: false },
      { x: WIDTH + 80 + PIPE_SPACING, gapY: 290, passed: false },
      { x: WIDTH + 80 + PIPE_SPACING * 2, gapY: 180, passed: false },
    ],
    score: 0,
    frame: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nextGap(frame: number) {
  const wave = Math.sin(frame * 0.37) * 78;
  const secondary = Math.cos(frame * 0.19) * 34;
  return clamp(HEIGHT / 2 + wave + secondary, 110, HEIGHT - 110);
}

function hasCollision(world: GameWorld) {
  if (world.birdY - BIRD_RADIUS <= 0 || world.birdY + BIRD_RADIUS >= HEIGHT) {
    return true;
  }

  return world.pipes.some((pipe) => {
    const insidePipeX =
      BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
    const outsideGap =
      world.birdY - BIRD_RADIUS < pipe.gapY - GAP_HEIGHT / 2 ||
      world.birdY + BIRD_RADIUS > pipe.gapY + GAP_HEIGHT / 2;

    return insidePipeX && outsideGap;
  });
}

function drawWorld(
  context: CanvasRenderingContext2D,
  world: GameWorld,
  status: GameStatus,
  calibrated: boolean,
) {
  context.clearRect(0, 0, WIDTH, HEIGHT);

  const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#dff3ff');
  sky.addColorStop(1, '#f4fbf3');
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 170 - world.frame * 0.4) % (WIDTH + 160)) - 80;
    context.beginPath();
    context.ellipse(x, 74 + i * 26, 42, 13, 0, 0, Math.PI * 2);
    context.fill();
  }

  world.pipes.forEach((pipe) => {
    const topHeight = pipe.gapY - GAP_HEIGHT / 2;
    const bottomY = pipe.gapY + GAP_HEIGHT / 2;

    context.fillStyle = '#2f9b65';
    context.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);
    context.fillRect(pipe.x, bottomY, PIPE_WIDTH, HEIGHT - bottomY);
    context.fillStyle = '#21784c';
    context.fillRect(pipe.x - 7, topHeight - 20, PIPE_WIDTH + 14, 20);
    context.fillRect(pipe.x - 7, bottomY, PIPE_WIDTH + 14, 20);
  });

  context.fillStyle = '#e4b338';
  context.beginPath();
  context.arc(BIRD_X, world.birdY, BIRD_RADIUS, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#f9dc62';
  context.beginPath();
  context.ellipse(BIRD_X - 5, world.birdY + 6, 13, 8, -0.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#19324d';
  context.beginPath();
  context.arc(BIRD_X + 7, world.birdY - 6, 3.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#f47d4a';
  context.beginPath();
  context.moveTo(BIRD_X + BIRD_RADIUS - 1, world.birdY);
  context.lineTo(BIRD_X + BIRD_RADIUS + 16, world.birdY + 7);
  context.lineTo(BIRD_X + BIRD_RADIUS - 1, world.birdY + 11);
  context.closePath();
  context.fill();

  context.fillStyle = '#19324d';
  context.font = '700 26px Inter, system-ui, sans-serif';
  context.fillText(String(world.score), 24, 42);

  if (status !== 'playing') {
    context.fillStyle = 'rgba(13, 27, 42, 0.54)';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.font = '700 28px Inter, system-ui, sans-serif';
    const label =
      status === 'game-over'
        ? 'Game over'
        : calibrated
          ? 'Ready for wrist flight'
          : 'Calibrate your wrist first';
    context.fillText(label, WIDTH / 2, HEIGHT / 2 - 10);
    context.font = '500 16px Inter, system-ui, sans-serif';
    context.fillText('Repeat gentle lifts to climb. Relax to fall.', WIDTH / 2, HEIGHT / 2 + 24);
    context.textAlign = 'start';
  }
}

export function GameCanvas({
  wristControl,
  liftSignal,
  calibrated,
  status,
  resetSignal,
  onStatusChange,
  onScoreChange,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<GameWorld>(makeInitialWorld());
  const statusRef = useRef(status);
  const controlRef = useRef(wristControl);
  const liftSignalRef = useRef(liftSignal);
  const handledLiftSignalRef = useRef(liftSignal);
  const animationRef = useRef<number | null>(null);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    controlRef.current = wristControl;
  }, [wristControl]);

  useEffect(() => {
    liftSignalRef.current = liftSignal;
  }, [liftSignal]);

  const resetWorld = useCallback(() => {
    worldRef.current = makeInitialWorld();
    handledLiftSignalRef.current = liftSignalRef.current;
    onScoreChange(0);
  }, [onScoreChange]);

  const step = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const world = worldRef.current;

    if (!canvas || !context) {
      return;
    }

    if (statusRef.current === 'playing') {
      const hasNewLift = liftSignalRef.current !== handledLiftSignalRef.current;
      const gravity = world.frame < START_GRACE_FRAMES && !hasNewLift ? GRAVITY * 0.35 : GRAVITY;

      if (hasNewLift) {
        const control = Math.max(controlRef.current, 0);
        const impulse = FLAP_IMPULSE * (1 + Math.min(control, 1) * 0.22);
        world.birdVelocity = Math.min(world.birdVelocity, 0.8) - impulse;
        handledLiftSignalRef.current = liftSignalRef.current;
      } else {
        world.birdVelocity *= GLIDE_DAMPING;
      }

      world.birdVelocity += gravity;
      world.birdVelocity = clamp(world.birdVelocity, -10.2, 8.2);
      world.birdY += world.birdVelocity;
      world.frame += 1;

      world.pipes = world.pipes.map((pipe) => ({
        ...pipe,
        x: pipe.x - PIPE_SPEED,
      }));

      const firstPipe = world.pipes[0];
      if (firstPipe && firstPipe.x + PIPE_WIDTH < -10) {
        world.pipes.shift();
        const lastPipe = world.pipes[world.pipes.length - 1];
        world.pipes.push({
          x: (lastPipe?.x ?? WIDTH) + PIPE_SPACING,
          gapY: nextGap(world.frame),
          passed: false,
        });
      }

      world.pipes.forEach((pipe) => {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
          pipe.passed = true;
          world.score += 1;
          onScoreChange(world.score);
          setHighScore((current) => Math.max(current, world.score));
        }
      });

      if (hasCollision(world)) {
        onStatusChange('game-over');
      }
    }

    drawWorld(context, world, statusRef.current, calibrated);
    animationRef.current = window.requestAnimationFrame(step);
  }, [calibrated, onScoreChange, onStatusChange]);

  useEffect(() => {
    animationRef.current = window.requestAnimationFrame(step);
    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [step]);

  useEffect(() => {
    if (status === 'ready' || status === 'idle') {
      resetWorld();
    }
  }, [resetWorld, status]);

  useEffect(() => {
    resetWorld();
  }, [resetSignal, resetWorld]);

  return (
    <div className="game-shell">
      <div className="game-meta">
        <span>Best {highScore}</span>
        <span>{calibrated ? 'Wrist input live' : 'Awaiting calibration'}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={WIDTH}
        height={HEIGHT}
        aria-label="StrongWrist Flappy Bird style game"
      />
    </div>
  );
}
