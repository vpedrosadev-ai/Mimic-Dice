#!/usr/bin/env bash
set -euo pipefail

release_dir="${1:-}"
if [[ -z "${release_dir}" || ! -d "${release_dir}" ]]; then
  echo "Usage: sudo bash deploy/oci/activate-release.sh /opt/mimic-dice/releases/<release>" >&2
  exit 1
fi

release_dir="$(readlink -f "${release_dir}")"
case "${release_dir}" in
  /opt/mimic-dice/releases/*) ;;
  *) echo "Release must live below /opt/mimic-dice/releases." >&2; exit 1 ;;
esac

if [[ ! -f "${release_dir}/server/index.js" || ! -f "${release_dir}/dist/index.html" ]]; then
  echo "Release is missing server/index.js or dist/index.html." >&2
  exit 1
fi

cd "${release_dir}"
npm ci --omit=dev
chown -R mimic-dice:mimic-dice "${release_dir}"
ln -sfn "${release_dir}" /opt/mimic-dice/current.next
mv -Tf /opt/mimic-dice/current.next /opt/mimic-dice/current
systemctl restart mimic-dice.service
systemctl --no-pager --full status mimic-dice.service
