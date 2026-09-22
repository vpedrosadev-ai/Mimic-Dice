import assert from "node:assert/strict";
import {
  createFightClubCharacterXml,
  getFightClubCharacterXmlFileName
} from "../src/screens/characters/characterFightClubXml.js";

const character = {
  id: "character-test-1",
  name: "Ária & Compañía <Maga>",
  species: "Elfa alta",
  background: "Sabia",
  className: "Mago",
  subclassName: "Evocación",
  level: 5,
  totalExperiencePoints: 6500,
  classEntries: [{ name: "Mago", subclassName: "Evocación", level: 5 }],
  abilities: { str: 8, dex: 14, con: 13, int: 18, wis: 12, cha: 10 },
  maxHp: 32,
  currentHp: 27,
  proficiencies: ["save:int", "save:wis", "skill:arcana", "skill:perception"],
  expertise: ["skill:arcana"],
  spellSlots: [
    { level: 1, slots: 4, spent: [true, false, false, false] },
    { level: 2, slots: 3, spent: [true, true, false] },
    { level: 3, slots: 2, spent: [false, false] }
  ],
  spells: [{
    name: "Bola de fuego",
    level: "Nivel 3",
    school: "Evocación",
    prepared: true,
    castingTime: "1 acción",
    range: "150 pies",
    components: "V, S, M",
    duration: "Instantáneo",
    text: "Daño de fuego & luz."
  }],
  spellbookAbilities: [{
    name: "Recuperación arcana",
    description: "Recupera espacios.",
    uses: 2,
    spent: [true, false]
  }],
  inventory: [
    { name: "ORO", quantity: 25 },
    { name: "PLATA", quantity: 4 },
    {
      name: "Bastón & foco",
      quantity: 1,
      type: "Arma",
      damage: "1d6 contundente",
      weightNumber: 4,
      valueNumber: 0.2,
      text: "Versátil <mágico>"
    }
  ],
  notes: "Nota privada\u0001 & segura"
};

const xml = createFightClubCharacterXml(character);

assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<pc version="5">/);
assert.match(xml, /<name>Ária &amp; Compañía &lt;Maga&gt;<\/name>/);
assert.match(xml, /<abilities>8,14,13,18,12,10,<\/abilities>/);
assert.match(xml, /<hpMax>32<\/hpMax>/);
assert.match(xml, /<hpCurrent>27<\/hpCurrent>/);
assert.match(xml, /<xp>6500<\/xp>/);
assert.match(xml, /<name>Mago<\/name>/);
assert.match(xml, /<subclass>Evocación<\/subclass>/);
assert.match(xml, /<spellAbility>3<\/spellAbility>/);
assert.match(xml, /<slots>0,4,3,2,0,0,0,0,0,0,<\/slots>/);
assert.match(xml, /<slotsCurrent>0,3,1,2,0,0,0,0,0,0,<\/slotsCurrent>/);
assert.match(xml, /<proficiency>3<\/proficiency>/);
assert.match(xml, /<proficiency>102<\/proficiency>/);
assert.match(xml, /<proficiency>111<\/proficiency>/);
assert.match(xml, /<school>5<\/school>/);
assert.match(xml, /<prepared>1<\/prepared>/);
assert.match(xml, /<text>Daño de fuego &amp; luz\.<\/text>/);
assert.match(xml, /<tracker>[\s\S]*<value>1<\/value>[\s\S]*<formula>2<\/formula>[\s\S]*<\/tracker>/);
assert.match(xml, /<name>Bastón &amp; foco<\/name>/);
assert.match(xml, /<damage1H>1d6<\/damage1H>/);
assert.match(xml, /<name>Gold \(gp\)<\/name>[\s\S]*<quantity>25<\/quantity>/);
assert.match(xml, /<name>Silver \(sp\)<\/name>[\s\S]*<quantity>4<\/quantity>/);
assert.match(xml, /<text>Nota privada &amp; segura<\/text>/);
assert.doesNotMatch(xml, /\u0001/);
assert.equal(getFightClubCharacterXmlFileName(character), "Ária & Compañía -Maga-.xml");

assert.throws(
  () => createFightClubCharacterXml(null),
  /Se necesita un personaje/
);

console.log("Fight Club character XML tests passed.");
