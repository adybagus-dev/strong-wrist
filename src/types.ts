export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'permission-error'
  | 'tracking'
  | 'wrist-lost';

export type GameStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'game-over';

export type WristInput = {
  rawY: number | null;
  smoothedY: number | null;
  neutralY: number | null;
  control: number;
  liftSignal: number;
  liftDelta: number;
  detected: boolean;
};
