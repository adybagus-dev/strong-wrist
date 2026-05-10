import { Keyboard, RefreshCw, Video } from 'lucide-react';
import type { RefObject } from 'react';
import { formatPercent, type CameraStatus, type WristInput } from '../../shared';

type CameraPanelProps = {
  cameraStatus: CameraStatus;
  statusLabel: string;
  wristInput: WristInput;
  errorMessage: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  sensitivity: number;
  practiceMode: boolean;
  controlLabel: string;
  liftSignal: number;
  calibrationMessage: string;
  canCalibrate: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCalibrate: () => void;
  onTogglePracticeMode: () => void;
  onSensitivityChange: (sensitivity: number) => void;
};

export function CameraPanel({
  cameraStatus,
  statusLabel,
  wristInput,
  errorMessage,
  videoRef,
  overlayRef,
  sensitivity,
  practiceMode,
  controlLabel,
  liftSignal,
  calibrationMessage,
  canCalibrate,
  onStartCamera,
  onStopCamera,
  onCalibrate,
  onTogglePracticeMode,
  onSensitivityChange,
}: CameraPanelProps) {
  return (
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
          <strong>{liftSignal}</strong>
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
          onClick={onStartCamera}
          disabled={cameraStatus === 'requesting'}
        >
          <Video aria-hidden="true" />
          Start Camera
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onCalibrate}
          disabled={!canCalibrate}
        >
          <RefreshCw aria-hidden="true" />
          Calibrate
        </button>
        <button type="button" className="ghost-button" onClick={onStopCamera}>
          Stop
        </button>
        <button
          type="button"
          className={practiceMode ? 'secondary-button active-button' : 'secondary-button'}
          onClick={onTogglePracticeMode}
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
          onChange={(event) => onSensitivityChange(Number(event.target.value))}
        />
      </div>
      <p className="tracking-tip">
        The game now counts upward movement events, not held wrist position. Lift gently, then relax
        back near neutral before the next lift. Keep your full hand and wrist in frame.
      </p>
      <p className="safety-note">
        Stop immediately if you feel pain, numbness, dizziness, or unusual discomfort. Keep the
        motion slow and gentle; this app is for motivation only and does not provide medical advice
        or diagnosis.
      </p>
    </div>
  );
}
