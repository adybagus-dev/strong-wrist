import { Keyboard, Pause, Play, RefreshCw, RotateCcw, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GameCanvas } from './GameCanvas';
import type { GameStatus } from './types';
import { useWristTracking } from './useWristTracking';

function formatPercent(value: number | null) {
  if (value === null) {
    return '--';
  }

  return `${Math.round(value * 100)}%`;
}

function App() {
  const [sensitivity, setSensitivity] = useState(2.0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [manualControl, setManualControl] = useState(0);
  const [manualLiftSignal, setManualLiftSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const {
    videoRef,
    overlayRef,
    cameraStatus,
    statusLabel,
    wristInput,
    errorMessage,
    startCamera,
    stopCamera,
    calibrate,
  } = useWristTracking({ sensitivity });
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [score, setScore] = useState(0);
  const [calibrationMessage, setCalibrationMessage] = useState('Set a comfortable neutral wrist position.');

  const calibrated = practiceMode || wristInput.neutralY !== null;
  const canCalibrate = wristInput.detected && wristInput.smoothedY !== null;
  const canPlay = calibrated && (gameStatus === 'idle' || gameStatus === 'ready' || gameStatus === 'game-over');
  const effectiveControl = practiceMode ? manualControl : wristInput.control;
  const effectiveLiftSignal = practiceMode ? manualLiftSignal : wristInput.liftSignal;

  const controlLabel = useMemo(() => {
    if (practiceMode) {
      if (manualControl > 0.05) {
        return 'Keyboard lift';
      }
      if (manualControl < -0.05) {
        return 'Keyboard lower';
      }
      return 'Practice neutral';
    }

    if (!calibrated) {
      return 'Neutral wrist not set';
    }

    if (Math.abs(effectiveControl) < 0.05) {
      return 'Neutral';
    }

    return effectiveControl > 0 ? 'Lifting' : 'Lowering';
  }, [calibrated, effectiveControl, manualControl, practiceMode]);

  useEffect(() => {
    if (!practiceMode) {
      setManualControl(0);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'ArrowUp' || event.code === 'Space') {
        event.preventDefault();
        setManualControl(1);
        if (!event.repeat) {
          setManualLiftSignal((current) => current + 1);
        }
      }
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        setManualControl(-0.65);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowUp' || event.code === 'Space' || event.code === 'ArrowDown') {
        setManualControl(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [practiceMode]);

  const handleCalibrate = () => {
    const didCalibrate = calibrate();
    if (didCalibrate) {
      setGameStatus('ready');
      setCalibrationMessage('Neutral set. Repeat gentle lifts to climb; relax your wrist to fall.');
    } else {
      setCalibrationMessage('Place your wrist in view before calibrating.');
    }
  };

  const startGame = () => {
    if (!calibrated) {
      setCalibrationMessage('Calibrate first, or turn on practice controls.');
      return;
    }

    setScore(0);
    setResetSignal((current) => current + 1);
    setGameStatus('playing');
  };

  const pauseGame = () => {
    setGameStatus((current) => (current === 'playing' ? 'paused' : 'playing'));
  };

  const restartGame = () => {
    setScore(0);
    setResetSignal((current) => current + 1);
    setGameStatus(calibrated ? 'ready' : 'idle');
  };

  return (
    <main className="app">
      <section className="app-header" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Gentle wrist training game</p>
          <h1 id="app-title">StrongWrist</h1>
        </div>
        <div className="scoreboard" aria-label="Current game score">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
      </section>

      <section className="workspace" aria-label="Camera and game workspace">
        <div className="camera-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Camera</p>
              <h2>Wrist tracking</h2>
            </div>
            <span className={`status-pill status-${cameraStatus}`}>{statusLabel}</span>
          </div>

          <div className="video-frame">
            <video ref={videoRef} className="video-feed" playsInline muted />
            <canvas ref={overlayRef} className="tracking-overlay" aria-hidden="true" />
            {cameraStatus === 'idle' && (
              <div className="video-placeholder">
                <Video aria-hidden="true" />
                <span>Start the camera to track your wrist.</span>
              </div>
            )}
          </div>

          {errorMessage && <p className="error-message">{errorMessage}</p>}

          <div className="metrics-grid" aria-label="Wrist input readings">
            <div>
              <span>Raw wrist</span>
              <strong>{formatPercent(wristInput.rawY)}</strong>
            </div>
            <div>
              <span>Smooth wrist</span>
              <strong>{formatPercent(wristInput.smoothedY)}</strong>
            </div>
            <div>
              <span>Neutral</span>
              <strong>{formatPercent(wristInput.neutralY)}</strong>
            </div>
            <div>
              <span>Control</span>
              <strong>{controlLabel}</strong>
            </div>
            <div>
              <span>Lift events</span>
              <strong>{effectiveLiftSignal}</strong>
            </div>
            <div>
              <span>Lift motion</span>
              <strong>{wristInput.liftDelta > 0 ? `${Math.round(wristInput.liftDelta * 1000)}` : '0'}</strong>
            </div>
          </div>

          <div className="control-bar">
            <button
              type="button"
              className="primary-button"
              onClick={startCamera}
              disabled={cameraStatus === 'requesting'}
            >
              <Video aria-hidden="true" />
              Start Camera
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCalibrate}
              disabled={!canCalibrate}
            >
              <RefreshCw aria-hidden="true" />
              Calibrate
            </button>
            <button type="button" className="ghost-button" onClick={stopCamera}>
              Stop
            </button>
            <button
              type="button"
              className={practiceMode ? 'secondary-button active-button' : 'secondary-button'}
              onClick={() => {
                setPracticeMode((current) => !current);
                setCalibrationMessage(
                  practiceMode
                    ? 'Set a comfortable neutral wrist position.'
                    : 'Practice controls enabled. Tap Space or Arrow Up repeatedly to climb.',
                );
                setGameStatus((current) => (current === 'idle' ? 'ready' : current));
              }}
            >
              <Keyboard aria-hidden="true" />
              Practice
            </button>
          </div>

          <p className="helper-text">{calibrationMessage}</p>
          <div className="tuning-panel">
            <label htmlFor="sensitivity">
              Sensitivity
              <strong>{sensitivity.toFixed(1)}x</strong>
            </label>
            <input
              id="sensitivity"
              type="range"
              min="0.8"
              max="4"
              step="0.1"
              value={sensitivity}
              onChange={(event) => setSensitivity(Number(event.target.value))}
            />
          </div>
          <p className="tracking-tip">
            The game now counts upward movement events, not held wrist position. Lift gently, then
            relax back near neutral before the next lift. Keep your full hand and wrist in frame.
          </p>
          <p className="safety-note">
            Stop immediately if you feel pain, numbness, dizziness, or unusual discomfort. Keep the
            motion slow and gentle; this app is for motivation only and does not provide medical
            advice or diagnosis.
          </p>
        </div>

        <div className="game-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Game</p>
              <h2>Wrist flight</h2>
            </div>
            <span className={`status-pill status-game-${gameStatus}`}>{gameStatus.replace('-', ' ')}</span>
          </div>

          <GameCanvas
            wristControl={effectiveControl}
            liftSignal={effectiveLiftSignal}
            calibrated={calibrated}
            status={gameStatus}
            resetSignal={resetSignal}
            onStatusChange={setGameStatus}
            onScoreChange={setScore}
          />

          <div className="game-controls">
            <button type="button" className="primary-button" onClick={startGame} disabled={!canPlay}>
              <Play aria-hidden="true" />
              Start Game
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={pauseGame}
              disabled={gameStatus !== 'playing' && gameStatus !== 'paused'}
            >
              <Pause aria-hidden="true" />
              {gameStatus === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="secondary-button" onClick={restartGame}>
              <RotateCcw aria-hidden="true" />
              Restart
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
