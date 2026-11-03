# Alternative Windows host with Tailscale Funnel

This test host publishes the existing Node alternative runtime without putting Cloudflare in the request path.

## Public address

`https://mimicdice.tail8c7b68.ts.net`

Tailscale Funnel forwards HTTPS traffic to `http://127.0.0.1:8788`. The computer must be powered on, awake, connected to the internet, signed in to Tailscale, and running the scheduled host task.

## Google OAuth

Create a dedicated Google OAuth web client so the Cloudflare production client remains unchanged. Configure it with:

- Authorized JavaScript origin: `https://mimicdice.tail8c7b68.ts.net`
- Authorized redirect URI: `https://mimicdice.tail8c7b68.ts.net/api/auth/callback/google`

Then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deploy/tailscale/configure-windows-host.ps1
```

It prompts for the client ID and client secret, encrypts all secrets with Windows DPAPI, and saves the ignored configuration under `.runtime/windows-host/`. On the first run it also generates a new Auth.js secret and registration code. Later OAuth credential rotations preserve both existing values, so active application sessions are not invalidated unnecessarily.

The encrypted values can only be decrypted by the same Windows user on the same computer. The generated registration code is displayed once and should be stored in a password manager.

## Automatic startup

Run `deploy/tailscale/register-windows-host.ps1` once. It registers a current-user scheduled task named `Mimic Dice Tailscale Host` that starts at logon and restarts after failures.

The application log is ignored by Git and written to `.runtime/windows-host/server.log`.

## Verification

Public checks:

```powershell
npm.cmd run verify:alternative -- https://mimicdice.tail8c7b68.ts.net
```

Authenticated API, shared-campaign WebSocket, and Monsters League WebSocket checks:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deploy/tailscale/verify-windows-host.ps1
```

This helper decrypts `AUTH_SECRET` only in the verification process environment and removes the temporary Monsters League campaign after the check.

## Disable public access

Disabling Funnel immediately removes public access without deleting local data:

```powershell
& 'C:\Program Files\Tailscale\tailscale.exe' funnel reset
```

The scheduled task can be stopped or disabled independently from Task Scheduler.
