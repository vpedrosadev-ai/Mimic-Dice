import healIconUrl from "./buttons-icons/Curacion.png";
import damageIconUrl from "./buttons-icons/Daño.png";
import necroticIconUrl from "./buttons-icons/Necrotico.png";
import tempIconUrl from "./buttons-icons/Vida Temporal.png";

import agarradoIconUrl from "./conditions-icons/Agarrado.png";
import agotamientoIconUrl from "./conditions-icons/Agotamiento.png";
import apresadoIconUrl from "./conditions-icons/Apresado.png";
import asustadoIconUrl from "./conditions-icons/Asustado.png";
import aturdidoIconUrl from "./conditions-icons/Aturdido.png";
import cegadoIconUrl from "./conditions-icons/Cegado.png";
import derribadoIconUrl from "./conditions-icons/Derribado.png";
import dormidoIconUrl from "./conditions-icons/Dormido.png";
import ensordecidoIconUrl from "./conditions-icons/Ensordecido.png";
import envenenadoIconUrl from "./conditions-icons/Envenenado.png";
import hechizadoIconUrl from "./conditions-icons/Hechizado.png";
import incapacitadoIconUrl from "./conditions-icons/Incapacitado.png";
import inconscienteIconUrl from "./conditions-icons/Inconsciente.png";
import invisibleIconUrl from "./conditions-icons/Invisible.png";
import paralizadoIconUrl from "./conditions-icons/Paralizado.png";
import petrificadoIconUrl from "./conditions-icons/Petrificado.png";

const MINI_ACTION_ICON_URLS = Object.freeze({
  damage: damageIconUrl,
  heal: healIconUrl,
  necrotic: necroticIconUrl,
  temp: tempIconUrl
});

const STATUS_ICON_URLS = Object.freeze({
  agarrado: agarradoIconUrl,
  agotamiento: agotamientoIconUrl,
  apresado: apresadoIconUrl,
  asustado: asustadoIconUrl,
  aturdido: aturdidoIconUrl,
  cegado: cegadoIconUrl,
  derribado: derribadoIconUrl,
  dormido: dormidoIconUrl,
  ensordecido: ensordecidoIconUrl,
  envenenado: envenenadoIconUrl,
  hechizado: hechizadoIconUrl,
  incapacitado: incapacitadoIconUrl,
  inconsciente: inconscienteIconUrl,
  invisible: invisibleIconUrl,
  paralizado: paralizadoIconUrl,
  petrificado: petrificadoIconUrl
});

const STATUS_ICON_ALIASES = Object.freeze({
  ciego: "cegado",
  dormir: "dormido",
  restringido: "apresado",
  restrenido: "apresado",
  sordo: "ensordecido"
});

function normalizeIconKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function getCombatMiniActionIconUrl(kind) {
  return MINI_ACTION_ICON_URLS[kind] ?? "";
}

export function getCombatStatusIconUrl(statusName) {
  const normalizedStatus = normalizeIconKey(statusName).replace(/\s+\d+$/u, "");
  const statusKey = STATUS_ICON_ALIASES[normalizedStatus] ?? normalizedStatus;

  if (statusKey.startsWith("agotamiento")) {
    return STATUS_ICON_URLS.agotamiento;
  }

  return STATUS_ICON_URLS[statusKey] ?? "";
}
