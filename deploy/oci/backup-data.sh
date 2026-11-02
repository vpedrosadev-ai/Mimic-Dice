#!/usr/bin/env bash
set -euo pipefail

backup_root="/var/backups/mimic-dice"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
install -d -o root -g root -m 0700 "${backup_root}"
systemctl stop mimic-dice.service
trap 'systemctl start mimic-dice.service' EXIT
tar --create --gzip --file "${backup_root}/mimic-dice-${timestamp}.tar.gz" --directory /var/lib/mimic-dice .
find "${backup_root}" -type f -name 'mimic-dice-*.tar.gz' -mtime +14 -delete
echo "Backup created: ${backup_root}/mimic-dice-${timestamp}.tar.gz"
