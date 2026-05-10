## Goal

Create a web app inspired by Flappy Bird where the player controls the bird using wrist movement detected by the MacBook camera.

The purpose of the app is to make wrist rehabilitation exercises more engaging, especially for users recovering from wrist injuries and training wrist strength using a light barbell or wrist weight.

---

## Current Priority

Build the first MVP so users can:

- Open the web app in a browser
- Allow camera access
- See their camera feed on the left side
- Play a Flappy Bird-style game on the right side
- Control the bird using wrist movement detected from the camera

---

## MVP Requirements

### Core Features

- User can play a Flappy Bird-style game.
- User can control the bird with wrist movement.
- User can see the camera feed on the left side of the screen.
- User can see the game on the right side of the screen.
- The app can detect basic wrist position using the laptop camera.
- The app gives simple feedback when wrist movement is detected.
- The game can start, pause, restart, and show score.

### Layout Requirements

- Left side: live camera preview.
- Right side: Flappy Bird-style game canvas.
- Desktop-first layout for MacBook.
- Simple responsive fallback for smaller screens.

### Rehabilitation Safety Requirements

- This app is for light wrist training and motivation only.
- The app should not give medical diagnosis.
- Add a short safety message telling users to stop if they feel pain.
- Movement should be gentle and not require fast or extreme wrist motion.

---

## Recommended Tech Stack

### Frontend

Use:

- React
- Vite
- TypeScript

Reason:

- Simple setup
- Fast development
- Good for browser-based camera access
- Easier than Next.js for a game MVP
- No backend needed for the first MVP

### Game Rendering

Use:

- HTML Canvas

Reason:

- Good enough for a Flappy Bird-style 2D game
- Lightweight
- Easy to control inside React

### Wrist / Hand Tracking

Use:

- MediaPipe Hands or MediaPipe Tasks Vision

Reason:

- Runs directly in the browser
- Can detect hand and wrist landmarks from webcam video
- No Python backend needed for MVP
- Lower latency than sending camera frames to a server

### Backend

For the MVP:

- No backend required

## Tech Stack Decision

### Chosen MVP Stack

- Frontend: React + Vite + TypeScript
- Camera: Browser webcam API
- Hand Tracking: MediaPipe
- Game: HTML Canvas
- Backend: None for MVP

## Product Requirements

### Game Requirements

- Bird moves upward or downward based on wrist movement.
- Pipes move from right to left.
- User scores points by passing through pipes.
- Game ends when the bird hits a pipe or the ground.
- User can restart the game.
- Game should feel simple, smooth, and fun.

### Wrist Control Requirements

- Detect the user’s wrist position from the camera.
- Use vertical wrist movement to control the bird.
- Smooth the movement so the game does not feel shaky.
- Add calibration before the game starts.
- Store a neutral wrist position during calibration.
- Moving wrist upward should move the bird upward.
- Moving wrist downward should allow the bird to fall or move downward.

### Camera Requirements

- Ask user for camera permission.
- Show live camera preview.
- Show simple hand/wrist tracking overlay if possible.
- Display status:
  - Camera not started
  - Hand detected
  - Wrist detected
  - Wrist not detected

---

## User Flow

1. User opens the web app.
2. User sees camera panel on the left and game panel on the right.
3. User clicks `Start Camera`.
4. Browser asks for camera permission.
5. User places their wrist/hand in view.
6. App detects the wrist.
7. User clicks `Calibrate`.
8. App saves the neutral wrist position.
9. User clicks `Start Game`.
10. User controls the bird by moving their wrist.
11. User sees score during gameplay.
12. If game ends, user can restart.

---

## Pages / Screens

### Main Screen

Path:

- `/`

Sections:

- Left panel: camera preview and wrist detection status
- Right panel: Flappy Bird game
- Top or bottom controls:
  - Start Camera
  - Calibrate
  - Start Game
  - Pause
  - Restart

## Development Tasks

### Phase 1: App Setup

- [ ] Create React + Vite + TypeScript project
- [ ] Build main layout with camera panel on the left and game panel on the right
- [ ] Add basic responsive styling
- [ ] Add safety message for wrist rehabilitation

### Phase 2: Camera

- [ ] Request webcam permission
- [ ] Show live camera preview
- [ ] Handle camera permission errors
- [ ] Display camera status

### Phase 3: Wrist Detection

- [ ] Add MediaPipe hand tracking
- [ ] Detect wrist landmark from camera
- [ ] Show wrist detection status
- [ ] Smooth wrist movement input

### Phase 4: Game MVP

- [ ] Create Flappy Bird-style game using HTML Canvas
- [ ] Add bird movement, pipes, collision, score, and restart
- [ ] Connect wrist movement to bird movement
- [ ] Add start, pause, and restart controls

### Phase 5: MVP Polish

- [ ] Test on MacBook camera
- [ ] Adjust sensitivity
- [ ] Improve layout and visual feedback
- [ ] Fix bugs