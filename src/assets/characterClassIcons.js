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

const classIconEntries = [
  { key: "barbaro", aliases: ["barbaro", "barbarian"], src: barbaroIcon, alt: "Icono de barbaro" },
  { key: "bardo", aliases: ["bardo", "bard"], src: bardoIcon, alt: "Icono de bardo" },
  { key: "clerigo", aliases: ["clerigo", "cleric"], src: clerigoIcon, alt: "Icono de clerigo" },
  { key: "druida", aliases: ["druida", "druid"], src: druidaIcon, alt: "Icono de druida" },
  { key: "guerrero", aliases: ["guerrero", "fighter"], src: guerreroIcon, alt: "Icono de guerrero" },
  { key: "monje", aliases: ["monje", "monk"], src: monjeIcon, alt: "Icono de monje" },
  { key: "paladin", aliases: ["paladin"], src: paladinIcon, alt: "Icono de paladin" },
  { key: "explorador", aliases: ["explorador", "ranger"], src: exploradorIcon, alt: "Icono de explorador" },
  { key: "picaro", aliases: ["picaro", "rogue"], src: picaroIcon, alt: "Icono de picaro" },
  { key: "hechicero", aliases: ["hechicero", "sorcerer"], src: hechiceroIcon, alt: "Icono de hechicero" },
  { key: "brujo", aliases: ["brujo", "warlock"], src: brujoIcon, alt: "Icono de brujo" },
  { key: "mago", aliases: ["mago", "wizard"], src: magoIcon, alt: "Icono de mago" }
];

export function getCharacterClassIcon(className) {
  const normalizedClassName = String(className ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (!normalizedClassName) {
    return null;
  }

  return classIconEntries.find((entry) => entry.aliases.some((alias) => normalizedClassName.includes(alias))) ?? null;
}
