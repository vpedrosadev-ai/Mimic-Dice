import barbaroIcon from "./class-icons/barbaro.png";
import bardoIcon from "./class-icons/bardo.png";
import clerigoIcon from "./class-icons/clerigo.png";
import druidaIcon from "./class-icons/druida.png";
import guerreroIcon from "./class-icons/guerrero.png";
import monjeIcon from "./class-icons/monje.png";
import paladinIcon from "./class-icons/paladin.png";
import exploradorIcon from "./class-icons/explorador.png";
import picaroIcon from "./class-icons/picaro.png";
import hechiceroIcon from "./class-icons/hechicero.png";
import brujoIcon from "./class-icons/brujo.png";
import magoIcon from "./class-icons/mago.png";
import { getCharacterClassDefinition } from "../data/characterClasses.js";

const classIconEntries = [
  { key: "barbaro", classKey: "barbarian", src: barbaroIcon, alt: "Icono de barbaro" },
  { key: "bardo", classKey: "bard", src: bardoIcon, alt: "Icono de bardo" },
  { key: "clerigo", classKey: "cleric", src: clerigoIcon, alt: "Icono de clerigo" },
  { key: "druida", classKey: "druid", src: druidaIcon, alt: "Icono de druida" },
  { key: "guerrero", classKey: "fighter", src: guerreroIcon, alt: "Icono de guerrero" },
  { key: "monje", classKey: "monk", src: monjeIcon, alt: "Icono de monje" },
  { key: "paladin", classKey: "paladin", src: paladinIcon, alt: "Icono de paladin" },
  { key: "explorador", classKey: "ranger", src: exploradorIcon, alt: "Icono de explorador" },
  { key: "picaro", classKey: "rogue", src: picaroIcon, alt: "Icono de picaro" },
  { key: "hechicero", classKey: "sorcerer", src: hechiceroIcon, alt: "Icono de hechicero" },
  { key: "brujo", classKey: "warlock", src: brujoIcon, alt: "Icono de brujo" },
  { key: "mago", classKey: "wizard", src: magoIcon, alt: "Icono de mago" }
];

export function getCharacterClassIcon(className) {
  const definition = getCharacterClassDefinition(className);

  if (!definition) {
    return null;
  }

  return classIconEntries.find((entry) => entry.classKey === definition.key) ?? {
    key: definition.key,
    src: "",
    label: definition.english.slice(0, 1),
    alt: `Icono de ${definition.spanish.toLowerCase()}`
  };
}
