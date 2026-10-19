# World in Motion

An interactive 3D portfolio observatory built with React, Vite, Three.js, and React Three Fiber.
The intro begins with a procedural Big Bang, then moves through one dedicated star and portfolio
chapter at a time. Scroll transitions use a shared phase for the camera, star field, space lane,
3D content, and HTML copy.

## Requirements

- Node.js `22.23.3` (the version is pinned in `.nvmrc`)
- npm 10+

## Setup

```bash
nvm use
npm ci
```

If `nvm` is not installed, install Node.js `22.23.3` using your preferred version manager, then run
the `npm ci` command. Dependencies are locked in `package-lock.json`.

## Run locally

Start the Vite development server:

```bash
npm run dev
```

Open the printed local URL, normally <http://localhost:5173/>.

For a production-style local preview:

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

## Test and build

The project has one reproducible test command:

```bash
make test
```

The test suite is intentionally offline after dependencies have been installed. To create a
production build:

```bash
make build
```

## Docker

Build and run the project without installing Node.js on the host:

```bash
docker build -t world-in-motion .
docker run --rm -p 4173:4173 world-in-motion
```

Open <http://localhost:4173/>.

## Portfolio chapters

- Academics — NexHack 2.0 and the AgenticAI workshop
- Sports — District powerlifting champion
- CivicEye — <https://civiceye.co.in>
- AI Agents — Agripulse, CivicEye, and MetrikAI
- Current Project — building a personal operating system
- Contact

The AI project links are:

- Agripulse: <https://agripulse-ai-ten.vercel.app/>
- MetrikAI: <https://metrik-steel.vercel.app/>

## GitHub upload

This repository intentionally excludes `node_modules`, `dist`, local screencasts, visual-debug
captures, and environment files. Commit the source, lockfile, documentation, Dockerfile, and
runtime pin; regenerate dependencies and build output on the target machine or CI.
