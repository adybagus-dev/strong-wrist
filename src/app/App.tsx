import { useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { GamePanel } from '../features/game';
import { CameraPanel, useWristTracking } from '../features/tracking';
import type { GameStatus } from '../shared';
import { usePracticeControls } from './usePracticeControls';

const DEFAULT_CALIBRATION_MESSAGE = 'Set a comfortable neutral wrist position.';

function App() {
  const [sensitivity, setSensitivity] = useState(2.0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [score, setScore] = useState(0);
  const [calibrationMessage, setCalibrationMessage] = useState(DEFAULT_CALIBRATION_MESSAGE);

  const { manualControl, manualLiftSignal } = usePracticeControls(practiceMode);
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

  const calibrated = practiceMode || wristInput.neutralY !== null;
  const canCalibrate = wristInput.detected && wristInput.smoothedY !== null;
  const canPlay =
    calibrated && (gameStatus === 'idle' || gameStatus === 'ready' || gameStatus === 'game-over');
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

  const handleCalibrate = () => {
    const didCalibrate = calibrate();
    if (didCalibrate) {
      setGameStatus('ready');
      setCalibrationMessage('Neutral set. Repeat gentle lifts to climb; relax your wrist to fall.');
      return;
    }

    setCalibrationMessage('Place your wrist in view before calibrating.');
  };

  const handleTogglePracticeMode = () => {
    setPracticeMode((current) => {
      const next = !current;
      setCalibrationMessage(
        next
          ? 'Practice controls enabled. Tap Space or Arrow Up repeatedly to climb.'
          : DEFAULT_CALIBRATION_MESSAGE,
      );
      return next;
    });
    setGameStatus((current) => (current === 'idle' ? 'ready' : current));
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
      <AppHeader score={score} />

      <section className="workspace" aria-label="Camera and game workspace">
        <CameraPanel
          cameraStatus={cameraStatus}
          statusLabel={statusLabel}
          wristInput={wristInput}
          errorMessage={errorMessage}
          videoRef={videoRef}
          overlayRef={overlayRef}
          sensitivity={sensitivity}
          practiceMode={practiceMode}
          controlLabel={controlLabel}
          liftSignal={effectiveLiftSignal}
          calibrationMessage={calibrationMessage}
          canCalibrate={canCalibrate}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onCalibrate={handleCalibrate}
          onTogglePracticeMode={handleTogglePracticeMode}
          onSensitivityChange={setSensitivity}
        />

        <GamePanel
          wristControl={effectiveControl}
          liftSignal={effectiveLiftSignal}
          calibrated={calibrated}
          status={gameStatus}
          resetSignal={resetSignal}
          canPlay={canPlay}
          onStartGame={startGame}
          onPauseGame={pauseGame}
          onRestartGame={restartGame}
          onStatusChange={setGameStatus}
          onScoreChange={setScore}
        />
      </section>
    </main>
  );
}

export default App;
