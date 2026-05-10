# StrongWrist

StrongWrist is a browser-based wrist rehabilitation game inspired by Flappy Bird. It uses the MacBook camera and MediaPipe hand tracking to detect gentle wrist lifts, then turns each lift into a small flap in the game.

## Tech Stack

- React
- Vite
- TypeScript
- HTML Canvas
- MediaPipe Tasks Vision

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, start the camera, calibrate at a relaxed neutral wrist position, then repeat gentle lifts to climb.

## Project Structure

```text
src/
  app/                App composition and app-level hooks
  components/         Shared UI components
  features/
    game/             Canvas game and game panel
    tracking/         Camera panel and wrist tracking hook
  shared/             Shared types and small utilities
  main.tsx            React entry point
  styles.css          Global app styles
```

## Safety

This app is for motivation and light wrist training only. Stop immediately if you feel pain, numbness, dizziness, or unusual discomfort. It does not provide medical advice or diagnosis.
