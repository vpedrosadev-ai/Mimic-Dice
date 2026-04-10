# Mimic Dice

Starter project for a JavaScript web app prepared to become an Electron desktop app.

## Stack

- Vite for the web development workflow
- Vanilla JavaScript for a lightweight start
- Electron and electron-builder already configured in `package.json`

## Project structure

- `src/`: browser app code
- `electron/`: desktop shell entry points
- `dist/`: generated web build
- `dist-electron/`: generated desktop build

## Recommended system setup

Install these tools on Windows before the first run:

1. Git
2. Node.js LTS (includes npm)

Recommended versions:

- Node.js 22 LTS or newer
- npm 10 or newer

## First run

```powershell
npm install
npm run dev
```

## Run as Electron during development

```powershell
npm run electron:dev
```

## Desktop build

```powershell
npm run electron:build
```

## Notes

- The web app is the source of truth; Electron wraps the built frontend.
- Keep Node-specific access inside `electron/` and expose only safe APIs through `preload.js`.
- Once Node and Git are installed, initialize the repository with `git init`.
