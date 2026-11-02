# Alternative OCI host

This deployment runs Mimic Dice without Cloudflare in the request path. Cloudflare production remains unchanged.

## Implemented architecture

- Node.js serves the complete Vite build and existing `/api` handlers.
- SQLite emulates the D1 methods used by the application.
- Persistent filesystem storage emulates the R2 methods used by the application.
- Existing Durable Object room classes run with persistent JSON state and native Node WebSockets.
- Caddy terminates HTTPS and compresses static responses.
- systemd restarts the application and restricts filesystem access.

## Current migration snapshot

The ignored local directory `.migration-data/` contains the original D1 SQL export. The ignored `.runtime/` directory contains the restored SQLite database used by local verification.

The production R2 bucket reported zero objects at export time even though D1 contained 98 `cloud_assets` rows. Therefore no R2 binaries were available to copy. Static application assets are independent: the complete build contains about 1.17 GB and is deployed normally.

The importer clears OAuth access/refresh/ID tokens, stored sessions, and verification tokens from the migrated SQLite copy. User IDs, Google provider account IDs, campaigns, library entries, collaboration data, and application content remain intact. Use `--preserve-oauth-tokens` only for an offline archival restore, never for deployment.

## One-time user actions

1. Create an Oracle Cloud account and an Always Free Ampere A1 VM in the account home region.
2. Use Ubuntu, 2 OCPUs, 12 GB RAM, and at least a 50 GB boot volume.
3. Assign a public IPv4 address. Permit inbound TCP 80 and 443; restrict TCP 22 to the administrator IP where practical.
4. Create a hostname outside Cloudflare, for example with DuckDNS or deSEC, pointing to the VM public IP.
5. Add `https://HOST/api/auth/callback/google` to the Google OAuth client's authorized redirect URIs and `https://HOST` to authorized JavaScript origins.
6. Provide the VM IP/hostname and SSH access so the remaining installation can be automated.

Oracle and Google account creation cannot be performed by repository automation because they require owner acceptance, identity/payment verification, and account-level authorization.

## Host prerequisites

Install these packages on the Ubuntu VM:

- Node.js 22 LTS, available as `/usr/bin/node` and `/usr/bin/npm`.
- Caddy, available as `/usr/bin/caddy` with its normal systemd service.
- `git`, `rsync`, `build-essential`, and `python3`.

Then run from a checked-out release:

```bash
sudo bash deploy/oci/prepare-host.sh
```

Edit `/etc/mimic-dice/mimic-dice.env` and replace every placeholder. Use a new `AUTH_SECRET` and `REGISTRATION_CODE` for the alternative host:

```bash
openssl rand -base64 48
openssl rand -hex 16
```

Cloudflare only exposes the secret names, not their values. The Google client ID and secret must be read or rotated in Google Cloud Console. Configured names are `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `REGISTRATION_CODE`.

Install the Caddy configuration:

```bash
sudo cp deploy/oci/Caddyfile.example /etc/caddy/Caddyfile
sudoedit /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Database transfer

Recreate a clean deployment copy locally from the latest export:

```powershell
npm run db:import:cloudflare -- --force
```

Transfer it through SSH, then install it with restrictive ownership:

```powershell
scp .runtime/data/mimic-dice.sqlite USER@HOST:/tmp/mimic-dice.sqlite
```

```bash
sudo install -o mimic-dice -g mimic-dice -m 0600 /tmp/mimic-dice.sqlite /var/lib/mimic-dice/mimic-dice.sqlite
rm /tmp/mimic-dice.sqlite
```

## Release activation

Place a release under `/opt/mimic-dice/releases/RELEASE_ID`, then run:

```bash
sudo bash /opt/mimic-dice/releases/RELEASE_ID/deploy/oci/activate-release.sh /opt/mimic-dice/releases/RELEASE_ID
```

After DNS and HTTPS work:

```bash
npm run verify:alternative -- https://HOST
```

Run authenticated and WebSocket checks from the VM itself, where the database and environment file are available:

```bash
set -a
source /etc/mimic-dice/mimic-dice.env
set +a
npm run verify:alternative -- https://HOST --authenticated --multiplayer
```

## Automated releases

The manual GitHub Actions workflow `Deploy OCI Alternative` requires these repository secrets:

- `OCI_HOST`
- `OCI_USER`
- `OCI_SSH_PRIVATE_KEY`
- `OCI_SSH_KNOWN_HOSTS`
- `ALTERNATIVE_ORIGIN`

Generate `OCI_SSH_KNOWN_HOSTS` from a trusted first connection, verify its fingerprint against the OCI console, then store the complete known-hosts line. The workflow intentionally does not use an unverified `ssh-keyscan` during deployment.

## Backups and cutover

`deploy/oci/backup-data.sh` makes a local compressed backup while the service is stopped and retains 14 days. Copy backups to another machine or Oracle Object Storage before treating OCI as production.

Keep Cloudflare authoritative until these weekend tests pass repeatedly:

- home page and large cached image;
- Google login;
- campaign read/save/reload;
- image/PDF upload and retrieval;
- shared campaign presence and live combat updates;
- Monsters League room creation, join, draft, combat, and finalization;
- Spanish fibre and mobile connections during the affected hours.
