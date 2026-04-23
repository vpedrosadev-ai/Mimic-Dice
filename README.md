# Mimic Dice

Mimic Dice es una app web y de escritorio para ayudar a dirigir partidas de D&D 5e.

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

Version portable de Windows:

```powershell
npm run electron:build:portable
```

La salida queda en `dist-electron/`. El ejecutable portable esperado queda con nombre:

```text
Mimic-Dice-portable-0.1.0-x64.exe
```

Si en tu Windows local alguna build de Electron da guerra con permisos de firma o symlinks, la ruta mas fiable para distribuirla sigue siendo GitHub Actions.

## Descargar y probar en otro PC

La forma mas sencilla para alguien que no tenga Node, npm o entorno de desarrollo es usar la build portable ya empaquetada.

En GitHub:

1. Abre el repositorio.
2. Ve a `Actions`.
3. Abre la ultima ejecucion correcta del workflow `Build Desktop` en la rama `feature/desktop-build`.
4. Descarga el artefacto `mimic-dice-windows-portable`.
5. Extrae el `.zip` descargado.
6. Ejecuta `Mimic-Dice-portable-0.1.0-x64.exe`.

En el otro PC:

1. No hace falta instalar Node ni dependencias.
2. Si Windows muestra SmartScreen, pulsa `Mas informacion` y luego `Ejecutar de todas formas`.
3. Guarda el `.exe` en una carpeta fija si quieres conservar ahi las campanas guardadas.

## Notes

- The web app is the source of truth; Electron wraps the built frontend.
- Keep Node-specific access inside `electron/` and expose only safe APIs through `preload.js`.
- Once Node and Git are installed, initialize the repository with `git init`.
