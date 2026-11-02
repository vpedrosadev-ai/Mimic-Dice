#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/oci/prepare-host.sh" >&2
  exit 1
fi

if ! command -v node >/dev/null || ! node --version | grep -Eq '^v(22|24)\.'; then
  echo "Node.js 22 or 24 must be installed before running this script." >&2
  exit 1
fi

if ! command -v caddy >/dev/null; then
  echo "Caddy must be installed before running this script." >&2
  exit 1
fi

id mimic-dice >/dev/null 2>&1 || useradd --system --home /var/lib/mimic-dice --shell /usr/sbin/nologin mimic-dice
if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  usermod --append --groups mimic-dice "${SUDO_USER}"
fi
install -d -o mimic-dice -g mimic-dice -m 0750 /opt/mimic-dice/releases /var/lib/mimic-dice/objects /var/lib/mimic-dice/rooms
install -d -o root -g mimic-dice -m 0750 /etc/mimic-dice
install -o root -g root -m 0644 deploy/oci/mimic-dice.service /etc/systemd/system/mimic-dice.service

if [[ ! -f /etc/mimic-dice/mimic-dice.env ]]; then
  install -o root -g mimic-dice -m 0640 .env.oci.example /etc/mimic-dice/mimic-dice.env
  echo "Created /etc/mimic-dice/mimic-dice.env. Replace placeholders before starting service."
fi

systemctl daemon-reload
systemctl enable mimic-dice.service
echo "Host directories and systemd service prepared."
