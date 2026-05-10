import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { CameraStatus, WristInput } from './types';

const MODEL_ASSET =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_ASSET_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';
const SMOOTHING = 0.42;
const DEAD_ZONE = 0.008;
const BASE_RANGE = 0.13;
const LIFT_DELTA_BASE = 0.018;
const LIFT_COOLDOWN_MS = 360;
const REARM_DELTA_BASE = 0.009;
const REARM_CONTROL = 0.08;

type UseWristTrackingOptions = {
  sensitivity: number;
};

const emptyWristInput: WristInput = {
  rawY: null,
  smoothedY: null,
  neutralY: null,
  control: 0,
  liftSignal: 0,
  liftDelta: 0,
  detected: false,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeControl(
  neutralY: number | null,
  smoothedY: number | null,
  sensitivity: number,
) {
  if (neutralY === null || smoothedY === null) {
    return 0;
  }

  const delta = neutralY - smoothedY;
  if (Math.abs(delta) < DEAD_ZONE) {
    return 0;
  }

  const range = BASE_RANGE / sensitivity;
  return clamp(delta / range, -1, 1);
}

function getControlPoint(landmarks: NormalizedLandmark[]) {
  const wrist = landmarks[0];
  const indexBase = landmarks[5];
  const pinkyBase = landmarks[17];

  if (!wrist || !indexBase || !pinkyBase) {
    return wrist ?? null;
  }

  return {
    x: wrist.x * 0.5 + indexBase.x * 0.25 + pinkyBase.x * 0.25,
    y: wrist.y * 0.5 + indexBase.y * 0.25 + pinkyBase.y * 0.25,
    z: wrist.z,
    visibility: wrist.visibility,
  };
}

export function useWristTracking({ sensitivity }: UseWristTrackingOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const neutralYRef = useRef<number | null>(null);
  const smoothedYRef = useRef<number | null>(null);
  const previousSmoothedYRef = useRef<number | null>(null);
  const lastLiftAtRef = useRef(0);
  const liftArmedRef = useRef(true);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [wristInput, setWristInput] = useState<WristInput>(emptyWristInput);
  const [errorMessage, setErrorMessage] = useState('');

  const statusLabel = useMemo(() => {
    switch (cameraStatus) {
      case 'idle':
        return 'Camera not started';
      case 'requesting':
        return 'Requesting camera access';
      case 'ready':
        return 'Camera ready';
      case 'permission-error':
        return 'Camera permission needed';
      case 'tracking':
        return 'Wrist detected';
      case 'wrist-lost':
        return 'Wrist not detected';
      default:
        return 'Camera not started';
    }
  }, [cameraStatus]);

  const drawOverlay = useCallback((landmarks: NormalizedLandmark[], controlPoint: NormalizedLandmark | null) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !video || !context) {
      return;
    }

    const width = video.videoWidth || canvas.clientWidth;
    const height = video.videoHeight || canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);

    if (!controlPoint) {
      return;
    }

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
    ];

    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 3;
    connections.forEach(([start, end]) => {
      const a = landmarks[start];
      const b = landmarks[end];
      if (!a || !b) {
        return;
      }

      context.beginPath();
      context.moveTo(a.x * width, a.y * height);
      context.lineTo(b.x * width, b.y * height);
      context.stroke();
    });

    landmarks.forEach((point, index) => {
      context.fillStyle = index === 0 ? '#ffdf5d' : 'rgba(11, 116, 222, 0.9)';
      context.beginPath();
      context.arc(point.x * width, point.y * height, index === 0 ? 6 : 4, 0, Math.PI * 2);
      context.fill();
    });

    const x = controlPoint.x * width;
    const y = controlPoint.y * height;

    context.strokeStyle = 'rgba(255, 88, 88, 0.95)';
    context.lineWidth = 5;
    context.beginPath();
    context.arc(x, y, 24, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
  }, []);

  const updateWristInput = useCallback(
    (rawY: number | null, detected: boolean) => {
      if (rawY === null || !detected) {
        setWristInput((current) => ({
          ...current,
          rawY: null,
          control: 0,
          liftDelta: 0,
          detected: false,
        }));
        return;
      }

      const previous = smoothedYRef.current;
      const smoothed = previous === null ? rawY : previous + (rawY - previous) * SMOOTHING;
      const previousSmoothed = previousSmoothedYRef.current;
      const liftDelta = previousSmoothed === null ? 0 : previousSmoothed - smoothed;
      const liftThreshold = LIFT_DELTA_BASE / sensitivity;
      const rearmThreshold = REARM_DELTA_BASE / sensitivity;
      const control = normalizeControl(neutralYRef.current, smoothed, sensitivity);
      const now = performance.now();
      const relaxedAfterLift = liftDelta < -rearmThreshold || control < REARM_CONTROL;

      if (relaxedAfterLift) {
        liftArmedRef.current = true;
      }

      const didLift =
        neutralYRef.current !== null &&
        liftArmedRef.current &&
        liftDelta > liftThreshold &&
        now - lastLiftAtRef.current > LIFT_COOLDOWN_MS;

      if (didLift) {
        lastLiftAtRef.current = now;
        liftArmedRef.current = false;
      }

      previousSmoothedYRef.current = smoothed;
      smoothedYRef.current = smoothed;

      setWristInput((current) => ({
        rawY,
        smoothedY: smoothed,
        neutralY: neutralYRef.current,
        control,
        liftSignal: didLift ? current.liftSignal + 1 : current.liftSignal,
        liftDelta,
        detected: true,
      }));
    },
    [sensitivity],
  );

  const runDetection = useCallback(() => {
    const video = videoRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !handLandmarker) {
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current && video.videoWidth > 0) {
      lastVideoTimeRef.current = video.currentTime;
      const result = handLandmarker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks[0] ?? [];
      const controlPoint = getControlPoint(landmarks);

      drawOverlay(landmarks, controlPoint);
      updateWristInput(controlPoint?.y ?? null, Boolean(controlPoint));
      setCameraStatus(controlPoint ? 'tracking' : 'wrist-lost');
    }

    animationRef.current = window.requestAnimationFrame(runDetection);
  }, [drawOverlay, updateWristInput]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('permission-error');
      setErrorMessage('This browser does not support webcam access.');
      return;
    }

    try {
      setCameraStatus('requesting');
      setErrorMessage('');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 540 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      setCameraStatus('ready');

      const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_ROOT);
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.35,
        minHandPresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
      });

      animationRef.current = window.requestAnimationFrame(runDetection);
    } catch (error) {
      setCameraStatus('permission-error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to start the camera or hand tracker.',
      );
    }
  }, [runDetection]);

  const calibrate = useCallback(() => {
    if (!wristInput.detected || wristInput.smoothedY === null) {
      return false;
    }

    neutralYRef.current = wristInput.smoothedY;
    previousSmoothedYRef.current = wristInput.smoothedY;
    lastLiftAtRef.current = performance.now();
    liftArmedRef.current = true;
    setWristInput((current) => ({
      ...current,
      neutralY: wristInput.smoothedY,
      control: 0,
      liftDelta: 0,
    }));
    return true;
  }, [wristInput.detected, wristInput.smoothedY]);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    handLandmarkerRef.current?.close();
    handLandmarkerRef.current = null;
    setCameraStatus('idle');
    setWristInput(emptyWristInput);
    neutralYRef.current = null;
    smoothedYRef.current = null;
    previousSmoothedYRef.current = null;
    lastLiftAtRef.current = 0;
    liftArmedRef.current = true;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    videoRef,
    overlayRef,
    cameraStatus,
    statusLabel,
    wristInput,
    errorMessage,
    startCamera,
    stopCamera,
    calibrate,
  };
}
