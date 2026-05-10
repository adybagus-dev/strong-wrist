import { Pause, Play, RotateCcw } from 'lucide-react';
import type { GameStatus } from '../../shared';
import { GameCanvas } from './GameCanvas';

type GamePanelProps = {
  wristControl: number;
  liftSignal: number;
  calibrated: boolean;
  status: GameStatus;
  resetSignal: number;
  canPlay: boolean;
  onStartGame: () => void;
  onPauseGame: () => void;
  onRestartGame: () => void;
  onStatusChange: (status: GameStatus) => void;
  onScoreChange: (score: number) => void;
};

export function GamePanel({
  wristControl,
  liftSignal,
  calibrated,
  status,
  resetSignal,
  canPlay,
  onStartGame,
  onPauseGame,
  onRestartGame,
  onStatusChange,
  onScoreChange,
}: GamePanelProps) {
  return (
    <div className="game-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Game</p>
          <h2>Wrist flight</h2>
        </div>
        <span className={`status-pill status-game-${status}`}>{status.replace('-', ' ')}</span>
      </div>

      <GameCanvas
        wristControl={wristControl}
        liftSignal={liftSignal}
        calibrated={calibrated}
        status={status}
        resetSignal={resetSignal}
        onStatusChange={onStatusChange}
        onScoreChange={onScoreChange}
      />

      <div className="game-controls">
        <button type="button" className="primary-button" onClick={onStartGame} disabled={!canPlay}>
          <Play aria-hidden="true" />
          Start Game
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onPauseGame}
          disabled={status !== 'playing' && status !== 'paused'}
        >
          <Pause aria-hidden="true" />
          {status === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className="secondary-button" onClick={onRestartGame}>
          <RotateCcw aria-hidden="true" />
          Restart
        </button>
      </div>
    </div>
  );
}
