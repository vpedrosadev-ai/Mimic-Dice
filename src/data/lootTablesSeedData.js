const LOOT_TABLE_FOLDER_ID = "table-folder-loot-tables";

const LOOT_TABLES_EN = [
  {
    "id": "loot-table-a",
    "name": "Table A",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–50",
        "Potion of healing"
      ],
      [
        "51–60",
        "Spell scroll (cantrip)"
      ],
      [
        "61–70",
        "Potion of climbing"
      ],
      [
        "71–90",
        "Spell scroll (1st level)"
      ],
      [
        "91–94",
        "Spell scroll (2nd level)"
      ],
      [
        "95–98",
        "Potion of greater healing"
      ],
      [
        "99",
        "Bag of holding"
      ],
      [
        "0",
        "Driftglobe"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-b",
    "name": "Table B",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–15",
        "Potion of greater healing"
      ],
      [
        "16–22",
        "Potion of fire breath"
      ],
      [
        "23–29",
        "Potion of resistance"
      ],
      [
        "30–34",
        "Ammunition, +1"
      ],
      [
        "35–39",
        "Potion of animal friendship"
      ],
      [
        "40–44",
        "Potion of hill giant strength"
      ],
      [
        "45–49",
        "Potion of growth"
      ],
      [
        "50–54",
        "Potion of water breathing"
      ],
      [
        "55–59",
        "Spell scroll (2nd level)"
      ],
      [
        "60–64",
        "Spell scroll (3rd level)"
      ],
      [
        "65–67",
        "Bag of holding"
      ],
      [
        "68–70",
        "Keoghtom's ointment"
      ],
      [
        "71–73",
        "Oil of slipperiness"
      ],
      [
        "74–75",
        "Dust of disappearance"
      ],
      [
        "76–77",
        "Dust of dryness"
      ],
      [
        "78–79",
        "Dust of sneezing and choking"
      ],
      [
        "80–81",
        "Elemental gem"
      ],
      [
        "82–83",
        "Philter of love"
      ],
      [
        "84",
        "Alchemy jug"
      ],
      [
        "85",
        "Cap of water breathing"
      ],
      [
        "86",
        "Cloak of the manta ray"
      ],
      [
        "87",
        "Driftglobe"
      ],
      [
        "88",
        "Goggles of night"
      ],
      [
        "89",
        "Helm of comprehending languages"
      ],
      [
        "90",
        "Immovable rod"
      ],
      [
        "91",
        "Lantern of revealing"
      ],
      [
        "92",
        "Mariner's armor"
      ],
      [
        "93",
        "Mithral armor"
      ],
      [
        "94",
        "Potion of poison"
      ],
      [
        "95",
        "Ring of swimming"
      ],
      [
        "96",
        "Robe of useful items"
      ],
      [
        "97",
        "Rope of climbing"
      ],
      [
        "98",
        "Saddle of the cavalier"
      ],
      [
        "99",
        "Wand of magic detection"
      ],
      [
        "100",
        "Wand of secrets"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-c",
    "name": "Table C",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–15",
        "Potion of superior healing"
      ],
      [
        "16–22",
        "Spell scroll (4thlevel)"
      ],
      [
        "23–27",
        "Ammunition, +2"
      ],
      [
        "28–32",
        "Potion of clairvoyance"
      ],
      [
        "33–37",
        "Potion of diminution"
      ],
      [
        "38–42",
        "Potion of gaseous form"
      ],
      [
        "43–47",
        "Potion of frost giant strength"
      ],
      [
        "48–52",
        "Potion of stone giant strength"
      ],
      [
        "53–57",
        "Potion of heroism"
      ],
      [
        "58–62",
        "Potion of invulnerability"
      ],
      [
        "63–67",
        "Potion of mind reading"
      ],
      [
        "68–72",
        "Spell scroll (5thlevel)"
      ],
      [
        "73–75",
        "Elixir of health"
      ],
      [
        "76–78",
        "Oil of etherealness"
      ],
      [
        "79–81",
        "Potion of fire giant strength"
      ],
      [
        "82–84",
        "Quaal's feather token"
      ],
      [
        "85–87",
        "Scroll of protection"
      ],
      [
        "88–89",
        "Bag of beans"
      ],
      [
        "90-91",
        "Bead of force"
      ],
      [
        "92",
        "Chime of opening"
      ],
      [
        "93",
        "Decanter of endless water"
      ],
      [
        "94",
        "Eyes of minute seeing"
      ],
      [
        "95",
        "Folding boat"
      ],
      [
        "96",
        "Heward's handy haversack"
      ],
      [
        "97",
        "Horseshoes of speed"
      ],
      [
        "98",
        "Necklace of fireballs"
      ],
      [
        "99",
        "Periapt of health"
      ],
      [
        "100",
        "Sending Stones"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-d",
    "name": "Table D",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–20",
        "Potion of supreme healing"
      ],
      [
        "21–30",
        "Potion of invisibility"
      ],
      [
        "31–40",
        "Potion of speed"
      ],
      [
        "41–50",
        "Spell scroll (6thlevel)"
      ],
      [
        "51–57",
        "Spell scroll (7thlevel)"
      ],
      [
        "58–62",
        "Ammunition, +3"
      ],
      [
        "63–67",
        "Oil of sharpness"
      ],
      [
        "68–72",
        "Potion of flying"
      ],
      [
        "73–77",
        "Potion of cloud giant strength"
      ],
      [
        "78–82",
        "Potion of longevity"
      ],
      [
        "83–87",
        "Potion of vitality"
      ],
      [
        "88–92",
        "Spell scroll (8thlevel)"
      ],
      [
        "93–95",
        "Horseshoes of a zephyr"
      ],
      [
        "96–98",
        "Nolzur's marvelous pigments"
      ],
      [
        "99",
        "Bag of devouring"
      ],
      [
        "100",
        "Portable hole"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-e",
    "name": "Table E",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–30",
        "Spell scroll (8thlevel)"
      ],
      [
        "31–55",
        "Potion of storm giant strength"
      ],
      [
        "56–70",
        "Poti on of supreme healing"
      ],
      [
        "71–85",
        "Spell scroll (9st level)"
      ],
      [
        "86–93",
        "Universal solvent"
      ],
      [
        "94–98",
        "Arrow of slaying"
      ],
      [
        "99-100",
        "Sovereign glue"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-f",
    "name": "Table F",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–15",
        "Weapon, +1"
      ],
      [
        "16–18",
        "Shield,+ 1"
      ],
      [
        "19–21",
        "Sentinel shield"
      ],
      [
        "22–23",
        "Amulet of proof against detection and location"
      ],
      [
        "24–25",
        "Boots of elvenkind"
      ],
      [
        "26–27",
        "Boots of striding and springing"
      ],
      [
        "27–29",
        "Bracers of archery"
      ],
      [
        "30–31",
        "Brooch of shielding"
      ],
      [
        "32–33",
        "Broom of flying"
      ],
      [
        "34–35",
        "Cloak of elvenkind"
      ],
      [
        "36–37",
        "Cloak of protection"
      ],
      [
        "38–39",
        "Gauntlets of ogre power"
      ],
      [
        "40–41",
        "Hat of disguise"
      ],
      [
        "42–43",
        "Javelin of lightning"
      ],
      [
        "44–45",
        "Pearl of power"
      ],
      [
        "46–47",
        "Rod of the pact keeper, + 1"
      ],
      [
        "48–49",
        "Slippers of spider climbing"
      ],
      [
        "50–51",
        "Staff of the adder"
      ],
      [
        "52-53",
        "Staff of the python"
      ],
      [
        "54-55",
        "Sword of vengeance"
      ],
      [
        "56–57",
        "Trident of fish command"
      ],
      [
        "58–59",
        "Wand of magic missiles"
      ],
      [
        "60–61",
        "Wand of the war mage, + 1"
      ],
      [
        "62–63",
        "Wand of web"
      ],
      [
        "64-65",
        "Weapon of warning"
      ],
      [
        "66",
        "Adamantine armor (chain mail)"
      ],
      [
        "67",
        "Adamantine armor (chain shirt)"
      ],
      [
        "68",
        "Adamantine armor (scale mail)"
      ],
      [
        "69",
        "Bag of tricks (gray)"
      ],
      [
        "70",
        "Bag of tricks (rust)"
      ],
      [
        "71",
        "Bag of tricks (tan)"
      ],
      [
        "72",
        "Boots of the winterlands"
      ],
      [
        "73",
        "Circlet of blasting"
      ],
      [
        "74",
        "Deck of illusions"
      ],
      [
        "75",
        "Eversmoking bottle"
      ],
      [
        "76",
        "Eyes of charming"
      ],
      [
        "77",
        "Eyes of the eagle"
      ],
      [
        "78",
        "Figurine of wondrous power (silver raven)"
      ],
      [
        "79",
        "Gem of brightness"
      ],
      [
        "80",
        "Gloves of missile snaring"
      ],
      [
        "81",
        "Gloves of swimming and climbing"
      ],
      [
        "82",
        "Gloves of thievery"
      ],
      [
        "83",
        "Headband of intellect"
      ],
      [
        "84",
        "Helm of telepathy"
      ],
      [
        "85",
        "Instrument of the bards (Doss lute)"
      ],
      [
        "86",
        "Instrument of the bards (Fochlucan bandore)"
      ],
      [
        "87",
        "Instrument of the bards (Mac-Fuimidh cittern)"
      ],
      [
        "88",
        "Medallion of thoughts"
      ],
      [
        "89",
        "Necklace of adaptation"
      ],
      [
        "90",
        "Periapt of wound closure"
      ],
      [
        "91",
        "Pipes of haunting"
      ],
      [
        "92",
        "Pipes of the sewers"
      ],
      [
        "93",
        "Ring of jumping"
      ],
      [
        "94",
        "Ring of mind shielding"
      ],
      [
        "95",
        "Ring of warmth"
      ],
      [
        "96",
        "Ring of water walking"
      ],
      [
        "97",
        "Quiver of Ehlonna"
      ],
      [
        "98",
        "Stone of good luck"
      ],
      [
        "99",
        "Wind fan"
      ],
      [
        "100",
        "Winged boots"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-g",
    "name": "Table G",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–11",
        "Weapon, +2"
      ],
      [
        "12–14",
        "Figurine of wondrous power (roll d8)"
      ],
      [
        "-",
        "1: Bronze griffon"
      ],
      [
        "-",
        "2: Ebony fly"
      ],
      [
        "-",
        "3: Golden lions"
      ],
      [
        "-",
        "4: Ivory goats"
      ],
      [
        "-",
        "5: Marble elephant"
      ],
      [
        "-",
        "6-7: Onyx dog"
      ],
      [
        "-",
        "8: Serpentine owl"
      ],
      [
        "15",
        "Adamantine armor (breastplate)"
      ],
      [
        "16",
        "Adamantine armor (splint)"
      ],
      [
        "17",
        "Amulet of health"
      ],
      [
        "18",
        "Armor of vulnerability"
      ],
      [
        "19",
        "Arrow-catching shield"
      ],
      [
        "20",
        "Belt of dwarvenkind"
      ],
      [
        "21",
        "Belt of hill giant strength"
      ],
      [
        "22",
        "Berserker axe"
      ],
      [
        "23",
        "Boots of levitation"
      ],
      [
        "24",
        "Boots of speed"
      ],
      [
        "25",
        "Bowl of commanding water elementals"
      ],
      [
        "26",
        "Bracers of defense"
      ],
      [
        "27",
        "Brazier of commanding fire elementals"
      ],
      [
        "28",
        "Cape of the mountebank"
      ],
      [
        "29",
        "Censer of controlling air elementals"
      ],
      [
        "30",
        "Armor, +1 chain mail"
      ],
      [
        "31",
        "Armor of resistance (chain mail)"
      ],
      [
        "32",
        "Armor of resistance (chain shirt)"
      ],
      [
        "33",
        "Armor,+ 1 chain shirt"
      ],
      [
        "34",
        "Cloak of displacement"
      ],
      [
        "35",
        "Cloak of the bat"
      ],
      [
        "36",
        "Cube of force"
      ],
      [
        "37",
        "Daern's instant fortress"
      ],
      [
        "38",
        "Dagger of venom"
      ],
      [
        "39",
        "Dimensional shackles"
      ],
      [
        "40",
        "Dragon slayer"
      ],
      [
        "41",
        "Elven chain"
      ],
      [
        "42",
        "Flame tongue"
      ],
      [
        "43",
        "Gem of seeing"
      ],
      [
        "44",
        "Giant slayer"
      ],
      [
        "45",
        "Clamoured studded leather"
      ],
      [
        "46",
        "Helm of teleportation"
      ],
      [
        "47",
        "Horn of blasting"
      ],
      [
        "48",
        "Horn of Valhalla (silver or brass)"
      ],
      [
        "49",
        "Instrument of the bards (Canaithmandolin)"
      ],
      [
        "50",
        "Instrument ofthe bards (Cii lyre)"
      ],
      [
        "51",
        "loun stone (awareness)"
      ],
      [
        "52",
        "loun stone (protection)"
      ],
      [
        "53",
        "loun stone (reserve)"
      ],
      [
        "54",
        "loun stone (sustenance)"
      ],
      [
        "55",
        "Iron bands of Bilarro"
      ],
      [
        "56",
        "Armor, + 1 leather"
      ],
      [
        "57",
        "Armor of resistance (leather)"
      ],
      [
        "58",
        "Mace of disruption"
      ],
      [
        "59",
        "Mace of smiting"
      ],
      [
        "60",
        "Mace of terror"
      ],
      [
        "61",
        "Mantle of spell resistance"
      ],
      [
        "62",
        "Necklace of prayer beads"
      ],
      [
        "63",
        "Periapt of proof against poison"
      ],
      [
        "64",
        "Ring of animal influence"
      ],
      [
        "65",
        "Ring of evasion"
      ],
      [
        "66",
        "Ring of feather falling"
      ],
      [
        "67",
        "Ring of free action"
      ],
      [
        "68",
        "Ring of protection"
      ],
      [
        "69",
        "Ring of resistance"
      ],
      [
        "70",
        "Ring of spell storing"
      ],
      [
        "71",
        "Ring of the ram"
      ],
      [
        "72",
        "Ring of X-ray vision"
      ],
      [
        "73",
        "Robe of eyes"
      ],
      [
        "74",
        "Rod of rulership"
      ],
      [
        "75",
        "Rod of the pact keeper, +2"
      ],
      [
        "76",
        "Rope of entanglement"
      ],
      [
        "77",
        "Armor, +1 scale mail"
      ],
      [
        "78",
        "Armor of resistance (scale mail)"
      ],
      [
        "79",
        "Shield, +2"
      ],
      [
        "80",
        "Shield of missile attraction"
      ],
      [
        "81",
        "Staff of charming"
      ],
      [
        "82",
        "Staff of healing"
      ],
      [
        "83",
        "Staff of swarming insects"
      ],
      [
        "84",
        "Staff of the woodlands"
      ],
      [
        "85",
        "Staff of withering"
      ],
      [
        "86",
        "Stone of controlling earthelementals"
      ],
      [
        "87",
        "Sun blade"
      ],
      [
        "88",
        "Sword of life stealing"
      ],
      [
        "89",
        "Sword of wounding"
      ],
      [
        "90",
        "Tentacle rod"
      ],
      [
        "91",
        "Vicious weapon"
      ],
      [
        "92",
        "Wand of binding"
      ],
      [
        "93",
        "Wand of enemy detection"
      ],
      [
        "94",
        "Wand of fear"
      ],
      [
        "95",
        "Wand of fireballs"
      ],
      [
        "96",
        "Wand of lightning bolts"
      ],
      [
        "97",
        "Wand of paralysis"
      ],
      [
        "98",
        "Wand of the war mage, +2"
      ],
      [
        "99",
        "Wand of wonder"
      ],
      [
        "100",
        "Wings of flying"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-h",
    "name": "Table H",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–10",
        "Weapon, +3"
      ],
      [
        "11–12",
        "Amulet of the planes"
      ],
      [
        "13–14",
        "Carpet of flying"
      ],
      [
        "15–16",
        "Crystal ball (very rare version)"
      ],
      [
        "17–18",
        "Ring of regeneration"
      ],
      [
        "19–20",
        "Ring of shooting stars"
      ],
      [
        "21–22",
        "Ring of telekinesis"
      ],
      [
        "23–24",
        "Robe of scintillating colors"
      ],
      [
        "25–26",
        "Robe of stars"
      ],
      [
        "27–28",
        "Rod of absorption"
      ],
      [
        "29–30",
        "Rod of alertness"
      ],
      [
        "31–32",
        "Rod of security"
      ],
      [
        "33–34",
        "Rod of the pact keeper, +3"
      ],
      [
        "35–36",
        "Scimitar of speed"
      ],
      [
        "37–38",
        "Shield, +3"
      ],
      [
        "39–40",
        "Staff of fire"
      ],
      [
        "41–42",
        "Staff of frost"
      ],
      [
        "43–44",
        "Staff of power"
      ],
      [
        "45-46",
        "Staff of striking"
      ],
      [
        "47-48",
        "Staff of thunder and lightning"
      ],
      [
        "49–50",
        "Sword of sharpnes"
      ],
      [
        "51–52",
        "Wand of polymorph"
      ],
      [
        "53–54",
        "Wand of the war mage, + 3"
      ],
      [
        "55",
        "Adamantine armor (half plate)"
      ],
      [
        "56",
        "Adamantine armor (plate)"
      ],
      [
        "57",
        "Animated shield"
      ],
      [
        "58",
        "Belt of fire giant strength"
      ],
      [
        "59",
        "Belt of frost (or stone) giant strength"
      ],
      [
        "60",
        "Armor, + 1 breastplate"
      ],
      [
        "61",
        "Armor of resistance (breastplate)"
      ],
      [
        "62",
        "Candle of invocation"
      ],
      [
        "63",
        "Armor, +2 chain mail"
      ],
      [
        "64",
        "Armor, +2 chain shirt"
      ],
      [
        "65",
        "Cloak of arachnida"
      ],
      [
        "66",
        "Dancing sword"
      ],
      [
        "67",
        "Demon armor"
      ],
      [
        "68",
        "Dragon scale mail"
      ],
      [
        "69",
        "Dwarven plate"
      ],
      [
        "70",
        "Dwarven thrower"
      ],
      [
        "71",
        "Efreeti bottle"
      ],
      [
        "72",
        "Figurine of wondrous power (obsidian steed)"
      ],
      [
        "73",
        "Frost brand"
      ],
      [
        "74",
        "Helm of brilliance"
      ],
      [
        "75",
        "Horn ofValhalla (bronze)"
      ],
      [
        "76",
        "Instrument of the bards (Anstruthharp)"
      ],
      [
        "77",
        "loun stone (absorption)"
      ],
      [
        "78",
        "loun stone (agility)"
      ],
      [
        "79",
        "loun stone (fortitude)"
      ],
      [
        "80",
        "loun stone (insight)"
      ],
      [
        "81",
        "loun stone (intellect)"
      ],
      [
        "82",
        "loun stone (leadership)"
      ],
      [
        "83",
        "loun stone (strength)"
      ],
      [
        "84",
        "Armor, +2 leather"
      ],
      [
        "85",
        "Manual of bodily health"
      ],
      [
        "86",
        "Manual of gainful exercise"
      ],
      [
        "87",
        "Manual of golems"
      ],
      [
        "88",
        "Manual of quickness of action"
      ],
      [
        "89",
        "Mirror of life trapping"
      ],
      [
        "90",
        "Nine lives stealer"
      ],
      [
        "91",
        "Oathbow"
      ],
      [
        "92",
        "Armor, +2 scale mail"
      ],
      [
        "93",
        "Spellguard shield"
      ],
      [
        "94",
        "Armor, + 1 splint"
      ],
      [
        "95",
        "Armor of resistance (splint)"
      ],
      [
        "96",
        "Armor, + 1 studded leather"
      ],
      [
        "97",
        "Armor of resistance (studded leather)"
      ],
      [
        "98",
        "Tome of clear thought"
      ],
      [
        "99",
        "Tome of leadership and influence"
      ],
      [
        "100",
        "Tome of understanding"
      ]
    ],
    "collapsed": false
  },
  {
    "id": "loot-table-i",
    "name": "Table I",
    "folderId": "table-folder-loot-tables",
    "columns": [
      "d100",
      "Magic Item"
    ],
    "rows": [
      [
        "01–05",
        "Defender"
      ],
      [
        "06–10",
        "Hammer of thunderbolts"
      ],
      [
        "11–15",
        "Luck Blade"
      ],
      [
        "16–20",
        "Sword of answering"
      ],
      [
        "21–23",
        "Holy avenger"
      ],
      [
        "24–26",
        "Ring of djinni summoning"
      ],
      [
        "27–29",
        "Ring of invisibility"
      ],
      [
        "30–32",
        "Ring of spell turning"
      ],
      [
        "36–38",
        "Rod of lordly might"
      ],
      [
        "39–41",
        "Vorpal sword"
      ],
      [
        "42–43",
        "Belt of cloud giant strength"
      ],
      [
        "44–45",
        "Armor, +2 breastplate"
      ],
      [
        "46–47",
        "Armor, +3 chain mail"
      ],
      [
        "48–49",
        "Armor, +3 chain shirt"
      ],
      [
        "50–51",
        "Cloak of invisibility"
      ],
      [
        "52–53",
        "Crystal ball (legendary version)"
      ],
      [
        "54-55",
        "Armor, + 1 half plate"
      ],
      [
        "56-57",
        "Iron flask"
      ],
      [
        "58-59",
        "Armor, +3 leather"
      ],
      [
        "60-61",
        "Armor, +1 plate"
      ],
      [
        "62-63",
        "Robe of the archmagi"
      ],
      [
        "64-65",
        "Rod of resurrection"
      ],
      [
        "66-67",
        "Armor, +1 scale mail"
      ],
      [
        "68-69",
        "Scarab of protection"
      ],
      [
        "70-71",
        "Armor, +2 splint"
      ],
      [
        "72-73",
        "Armor, +2 studded leather"
      ],
      [
        "74-75",
        "Well of many worlds"
      ],
      [
        "76",
        "Magic armor (roll dl2)"
      ],
      [
        "-",
        "1-2: Armor, +2 half plate"
      ],
      [
        "-",
        "3-4: Armor, +2 plate"
      ],
      [
        "-",
        "5-6: Armor, +3 studded leather"
      ],
      [
        "-",
        "7-8: Armor, +3 breastplate"
      ],
      [
        "-",
        "9-10: Armor, +3 splint"
      ],
      [
        "-",
        "11: Armor, +3 half plate"
      ],
      [
        "-",
        "12: Armor, +3 plate"
      ],
      [
        "77",
        "Apparatus of Kwalish"
      ],
      [
        "78",
        "Armor of invulnerability"
      ],
      [
        "79",
        "Belt of storm giant strength"
      ],
      [
        "80",
        "Cubic gate"
      ],
      [
        "81",
        "Deck of many things"
      ],
      [
        "82",
        "Efreeti chain"
      ],
      [
        "83",
        "Armor of resistance (half plate)"
      ],
      [
        "84",
        "Horn ofValhalla (iron)"
      ],
      [
        "85",
        "Instrument of the bards (OIIamh harp)"
      ],
      [
        "86",
        "loun stone (greater absorption)"
      ],
      [
        "87",
        "loun stone (mastery)"
      ],
      [
        "88",
        "loun stone (regeneration)"
      ],
      [
        "89",
        "Plate armor of etherealness"
      ],
      [
        "90",
        "Plate armor of resistance"
      ],
      [
        "91",
        "Ring of air elemental command"
      ],
      [
        "92",
        "Ring of earthelemental command"
      ],
      [
        "93",
        "Ring of fire elemental command"
      ],
      [
        "94",
        "Ring of three wishes"
      ],
      [
        "95",
        "Ring of water elemental command"
      ],
      [
        "96",
        "Sphere of annihilation"
      ],
      [
        "97",
        "Talisman of pure good"
      ],
      [
        "98",
        "Talisman of the sphere"
      ],
      [
        "99",
        "Talisman of ultimate evil"
      ],
      [
        "100",
        "Tome of the stilled tongue"
      ]
    ],
    "collapsed": false
  }
];

const LOOT_EXACT_ES = new Map([
  ["Poti on of supreme healing", "Pocion de curacion suprema"],
  ["Spell scroll (cantrip)", "Pergamino de conjuro (truco)"],
  ["Spell scroll (1st level)", "Pergamino de conjuro (nivel 1)"],
  ["Spell scroll (2nd level)", "Pergamino de conjuro (nivel 2)"],
  ["Spell scroll (3rd level)", "Pergamino de conjuro (nivel 3)"],
  ["Spell scroll (4thlevel)", "Pergamino de conjuro (nivel 4)"],
  ["Spell scroll (5thlevel)", "Pergamino de conjuro (nivel 5)"],
  ["Spell scroll (6thlevel)", "Pergamino de conjuro (nivel 6)"],
  ["Spell scroll (7thlevel)", "Pergamino de conjuro (nivel 7)"],
  ["Spell scroll (8thlevel)", "Pergamino de conjuro (nivel 8)"],
  ["Spell scroll (9st level)", "Pergamino de conjuro (nivel 9)"],
  ["Ammunition, +1", "Municion, +1"],
  ["Ammunition, +2", "Municion, +2"],
  ["Ammunition, +3", "Municion, +3"],
  ["Weapon, +1", "Arma, +1"],
  ["Weapon, +2", "Arma, +2"],
  ["Weapon, +3", "Arma, +3"],
  ["Shield,+ 1", "Escudo, +1"],
  ["Shield, +2", "Escudo, +2"],
  ["Shield, +3", "Escudo, +3"],
  ["Figurine of wondrous power (roll d8)", "Figurita de poder maravilloso (tira d8)"],
  ["1: Bronze griffon", "1: Grifo de bronce"],
  ["2: Ebony fly", "2: Mosca de ebano"],
  ["3: Golden lions", "3: Leones dorados"],
  ["4: Ivory goats", "4: Cabras de marfil"],
  ["5: Marble elephant", "5: Elefante de marmol"],
  ["6-7: Onyx dog", "6-7: Perro de onice"],
  ["8: Serpentine owl", "8: Buho serpentino"]
]);

const LOOT_PHRASE_ES = [
  ["Potion of supreme healing", "Pocion de curacion suprema"],
  ["Potion of superior healing", "Pocion de curacion superior"],
  ["Potion of greater healing", "Pocion de curacion mayor"],
  ["Potion of healing", "Pocion de curacion"],
  ["Potion of fire breath", "Pocion de aliento de fuego"],
  ["Potion of resistance", "Pocion de resistencia"],
  ["Potion of animal friendship", "Pocion de amistad animal"],
  ["Potion of hill giant strength", "Pocion de fuerza de gigante de las colinas"],
  ["Potion of frost giant strength", "Pocion de fuerza de gigante de escarcha"],
  ["Potion of stone giant strength", "Pocion de fuerza de gigante de piedra"],
  ["Potion of fire giant strength", "Pocion de fuerza de gigante de fuego"],
  ["Potion of cloud giant strength", "Pocion de fuerza de gigante de las nubes"],
  ["Potion of storm giant strength", "Pocion de fuerza de gigante de tormenta"],
  ["Potion of growth", "Pocion de crecimiento"],
  ["Potion of water breathing", "Pocion de respirar bajo el agua"],
  ["Potion of climbing", "Pocion de escalada"],
  ["Potion of clairvoyance", "Pocion de clarividencia"],
  ["Potion of diminution", "Pocion de disminucion"],
  ["Potion of gaseous form", "Pocion de forma gaseosa"],
  ["Potion of heroism", "Pocion de heroismo"],
  ["Potion of invulnerability", "Pocion de invulnerabilidad"],
  ["Potion of mind reading", "Pocion de lectura mental"],
  ["Potion of invisibility", "Pocion de invisibilidad"],
  ["Potion of speed", "Pocion de velocidad"],
  ["Potion of flying", "Pocion de vuelo"],
  ["Potion of longevity", "Pocion de longevidad"],
  ["Potion of vitality", "Pocion de vitalidad"],
  ["Potion of poison", "Pocion de veneno"],
  ["Oil of slipperiness", "Aceite de escurridizo"],
  ["Oil of etherealness", "Aceite de etereidad"],
  ["Oil of sharpness", "Aceite de filo"],
  ["Universal solvent", "Disolvente universal"],
  ["Sovereign glue", "Pegamento soberano"],
  ["Arrow of slaying", "Flecha asesina"],
  ["Bag of holding", "Bolsa de contencion"],
  ["Bag of beans", "Bolsa de judias"],
  ["Bag of devouring", "Bolsa devoradora"],
  ["Portable hole", "Agujero portatil"],
  ["Dust of disappearance", "Polvo de desaparicion"],
  ["Dust of dryness", "Polvo de sequedad"],
  ["Dust of sneezing and choking", "Polvo de estornudos y ahogo"],
  ["Elemental gem", "Gema elemental"],
  ["Philter of love", "Filtro de amor"],
  ["Alchemy jug", "Jarra alquimica"],
  ["Cap of water breathing", "Gorro de respirar bajo el agua"],
  ["Cloak of the manta ray", "Capa de la manta raya"],
  ["Goggles of night", "Gafas de vision nocturna"],
  ["Helm of comprehending languages", "Yelmo para comprender idiomas"],
  ["Immovable rod", "Vara inamovible"],
  ["Lantern of revealing", "Linterna de revelacion"],
  ["Mariner's armor", "Armadura de marinero"],
  ["Mithral armor", "Armadura de mitral"],
  ["Ring of swimming", "Anillo de natacion"],
  ["Ring of jumping", "Anillo de salto"],
  ["Ring of warmth", "Anillo de calidez"],
  ["Ring of water walking", "Anillo de caminar sobre el agua"],
  ["Robe of useful items", "Tunica de objetos utiles"],
  ["Rope of climbing", "Cuerda de escalada"],
  ["Saddle of the cavalier", "Silla del caballero"],
  ["Wand of magic detection", "Varita de deteccion magica"],
  ["Wand of secrets", "Varita de secretos"],
  ["Wand of magic missiles", "Varita de proyectiles magicos"],
  ["Wand of web", "Varita de telarana"],
  ["Wand of lightning bolts", "Varita de relampagos"],
  ["Wand of paralysis", "Varita de paralisis"],
  ["Wand of wonder", "Varita de maravillas"],
  ["Wand of the war mage", "Varita del mago de guerra"],
  ["Keoghtom's ointment", "Unguento de Keoghtom"],
  ["Quaal's feather token", "Ficha de pluma de Quaal"],
  ["Scroll of protection", "Pergamino de proteccion"],
  ["Bead of force", "Cuenta de fuerza"],
  ["Chime of opening", "Carillon de apertura"],
  ["Decanter of endless water", "Decantador de agua interminable"],
  ["Eyes of minute seeing", "Ojos de vision minuciosa"],
  ["Folding boat", "Barca plegable"],
  ["Heward's handy haversack", "Mochila practica de Heward"],
  ["Horseshoes of speed", "Herraduras de velocidad"],
  ["Horseshoes of a zephyr", "Herraduras del cefiro"],
  ["Necklace of fireballs", "Collar de bolas de fuego"],
  ["Periapt of health", "Periapto de salud"],
  ["Nolzur's marvelous pigments", "Pigmentos maravillosos de Nolzur"],
  ["Sentinel shield", "Escudo centinela"],
  ["Amulet of proof against detection and location", "Amuleto contra deteccion y localizacion"],
  ["Boots of elvenkind", "Botas elficas"],
  ["Boots of striding and springing", "Botas de zancadas y saltos"],
  ["Bracers of archery", "Brazales de arqueria"],
  ["Brooch of shielding", "Broche de escudo"],
  ["Broom of flying", "Escoba voladora"],
  ["Cloak of elvenkind", "Capa elfica"],
  ["Cloak of protection", "Capa de proteccion"],
  ["Gauntlets of ogre power", "Guanteletes de poder de ogro"],
  ["Hat of disguise", "Sombrero de disfraz"],
  ["Javelin of lightning", "Jabalina de relampago"],
  ["Pearl of power", "Perla de poder"],
  ["Rod of the pact keeper", "Vara del guardian del pacto"],
  ["Slippers of spider climbing", "Zapatillas de trepar como arana"],
  ["Staff of the adder", "Baston de la vibora"],
  ["Staff of the python", "Baston de la piton"],
  ["Sword of vengeance", "Espada de venganza"],
  ["Trident of fish command", "Tridente de mando de peces"],
  ["Weapon of warning", "Arma de advertencia"],
  ["Adamantine armor", "Armadura adamantina"],
  ["Bag of tricks", "Bolsa de trucos"],
  ["Boots of the winterlands", "Botas de las tierras invernales"],
  ["Circlet of blasting", "Diadema de estallido"],
  ["Deck of illusions", "Baraja de ilusiones"],
  ["Eversmoking bottle", "Botella de humo eterno"],
  ["Eyes of charming", "Ojos de encantamiento"],
  ["Eyes of the eagle", "Ojos del aguila"],
  ["Figurine of wondrous power", "Figurita de poder maravilloso"],
  ["Gem of brightness", "Gema de brillo"],
  ["Gloves of missile snaring", "Guantes atrapamisiles"],
  ["Gloves of swimming and climbing", "Guantes de nadar y trepar"],
  ["Gloves of thievery", "Guantes de latrocinio"],
  ["Headband of intellect", "Diadema de intelecto"],
  ["Helm of telepathy", "Yelmo de telepatia"],
  ["Instrument of the bards", "Instrumento de los bardos"],
  ["Medallion of thoughts", "Medallon de pensamientos"],
  ["Necklace of adaptation", "Collar de adaptacion"],
  ["Periapt of wound closure", "Periapto de cierre de heridas"],
  ["Pipes of haunting", "Flautas de apariciones"],
  ["Pipes of the sewers", "Flautas de las alcantarillas"],
  ["Ring of mind shielding", "Anillo de proteccion mental"],
  ["Ring of resistance", "Anillo de resistencia"],
  ["Stone of good luck", "Piedra de buena suerte"],
  ["Wind fan", "Abanico de viento"],
  ["Winged boots", "Botas aladas"],
  ["Amulet of health", "Amuleto de salud"],
  ["Armor of vulnerability", "Armadura de vulnerabilidad"],
  ["Arrow-catching shield", "Escudo atrapaflechas"],
  ["Belt of dwarvenkind", "Cinturon de los enanos"],
  ["Belt of hill giant strength", "Cinturon de fuerza de gigante de las colinas"],
  ["Berserker axe", "Hacha berserker"],
  ["Boots of levitation", "Botas de levitacion"],
  ["Boots of speed", "Botas de velocidad"],
  ["Bowl of commanding water elementals", "Cuenco de controlar elementales de agua"],
  ["Bracers of defense", "Brazales de defensa"],
  ["Brazier of commanding fire elementals", "Brasero de controlar elementales de fuego"],
  ["Cape of the mountebank", "Capa del saltimbanqui"],
  ["Censer of controlling air elementals", "Incensario de controlar elementales de aire"],
  ["Cloak of displacement", "Capa de desplazamiento"],
  ["Cloak of the bat", "Capa del murcielago"],
  ["Cube of force", "Cubo de fuerza"],
  ["Daern's instant fortress", "Fortaleza instantanea de Daern"],
  ["Dagger of venom", "Daga de veneno"],
  ["Dimensional shackles", "Grilletes dimensionales"],
  ["Dragon slayer", "Matadragones"],
  ["Elven chain", "Cota de malla elfica"],
  ["Flame tongue", "Lengua de fuego"],
  ["Gem of seeing", "Gema de vision"],
  ["Giant slayer", "Matagigantes"],
  ["Helm of teleportation", "Yelmo de teleportacion"],
  ["Horn of blasting", "Cuerno de detonacion"],
  ["Iron bands of Bilarro", "Bandas de hierro de Bilarro"],
  ["Mace of disruption", "Maza de disrupcion"],
  ["Mace of smiting", "Maza de castigo"],
  ["Mace of terror", "Maza de terror"],
  ["Mantle of spell resistance", "Manto de resistencia a conjuros"],
  ["Necklace of prayer beads", "Collar de cuentas de plegaria"],
  ["Periapt of proof against poison", "Periapto contra veneno"],
  ["Ring of animal influence", "Anillo de influencia animal"],
  ["Ring of evasion", "Anillo de evasion"],
  ["Ring of feather falling", "Anillo de caida de pluma"],
  ["Ring of free action", "Anillo de accion libre"],
  ["Sending Stones", "Piedras mensajeras"],
  ["Quiver of Ehlonna", "Carcaj de Ehlonna"],
  ["Glamoured studded leather", "Cuero tachonado glamuroso"],
  ["Clamoured studded leather", "Cuero tachonado glamuroso"],
  ["Horn of Valhalla", "Cuerno del Valhalla"],
  ["Horn ofValhalla", "Cuerno del Valhalla"],
  ["Instrument ofthe bards", "Instrumento de los bardos"],
  ["Cii lyre", "lira Cli"],
  ["Ioun stone", "Piedra ioun"],
  ["loun stone", "Piedra ioun"],
  ["awareness", "consciencia"],
  ["protection", "proteccion"],
  ["reserve", "reserva"],
  ["sustenance", "sustento"],
  ["absorption", "absorcion"],
  ["agility", "agilidad"],
  ["fortitude", "fortaleza"],
  ["insight", "perspicacia"],
  ["intellect", "intelecto"],
  ["leadership", "liderazgo"],
  ["strength", "fuerza"],
  ["greater absorption", "absorcion mayor"],
  ["mastery", "maestria"],
  ["regeneration", "regeneracion"],
  ["Ring of spell storing", "Anillo de almacenar conjuros"],
  ["Robe of eyes", "Tunica de ojos"],
  ["Rope of entanglement", "Cuerda de enmaranar"],
  ["Stone of controlling earthelementals", "Piedra de controlar elementales de tierra"],
  ["Tentacle rod", "Vara tentacular"],
  ["Carpet of flying", "Alfombra voladora"],
  ["Crystal ball", "Bola de cristal"],
  ["very rare version", "version muy rara"],
  ["legendary version", "version legendaria"],
  ["Robe of scintillating colors", "Tunica de colores centelleantes"],
  ["Robe of stars", "Tunica de estrellas"],
  ["Robe of the archmagi", "Tunica de los archimagos"],
  ["Belt of frost (or stone) giant strength", "Cinturon de fuerza de gigante de escarcha (o piedra)"],
  ["Candle of invocation", "Vela de invocacion"],
  ["Cloak of arachnida", "Capa de aracnida"],
  ["Dancing sword", "Espada danzante"],
  ["Dwarven plate", "Placas enanas"],
  ["Helm of brilliance", "Yelmo de brillantez"],
  ["Manual of bodily health", "Manual de salud corporal"],
  ["Manual of gainful exercise", "Manual de ejercicio provechoso"],
  ["Manual of golems", "Manual de golems"],
  ["Manual of quickness of action", "Manual de rapidez de accion"],
  ["Mirror of life trapping", "Espejo atrapavidas"],
  ["Tome of clear thought", "Tomo de pensamiento claro"],
  ["Tome of leadership and influence", "Tomo de liderazgo e influencia"],
  ["Tome of understanding", "Tomo de comprension"],
  ["Vorpal sword", "Espada vorpal"],
  ["Cloak of invisibility", "Capa de invisibilidad"],
  ["Scarab of protection", "Escarabajo de proteccion"],
  ["Well of many worlds", "Pozo de muchos mundos"],
  ["Deck of many things", "Baraja de muchas cosas"],
  ["Efreeti chain", "Cota de malla de efreeti"],
  ["Ring of air elemental command", "Anillo de controlar elemental de aire"],
  ["Ring of fire elemental command", "Anillo de controlar elemental de fuego"],
  ["Ring of water elemental command", "Anillo de controlar elemental de agua"],
  ["Sphere of annihilation", "Esfera de aniquilacion"],
  ["Talisman of pure good", "Talisman del bien puro"],
  ["Talisman of the sphere", "Talisman de la esfera"],
  ["Talisman of ultimate evil", "Talisman del mal supremo"],
  ["Tome of the stilled tongue", "Tomo de la lengua acallada"],
  ["Plate armor of etherealness", "Armadura de placas de etereidad"],
  ["Plate armor of resistance", "Armadura de placas de resistencia"]
];

function translateLootCell(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  if (LOOT_EXACT_ES.has(text)) {
    return LOOT_EXACT_ES.get(text);
  }

  let translated = text
    .replace(/\bchain mail\b/gi, "cota de malla")
    .replace(/\bchain shirt\b/gi, "camisa de malla")
    .replace(/\bscale mail\b/gi, "armadura de escamas")
    .replace(/\bstudded leather\b/gi, "cuero tachonado")
    .replace(/\bhalf plate\b/gi, "media armadura")
    .replace(/\bplate armor\b/gi, "armadura de placas")
    .replace(/\bplate\b/gi, "placas")
    .replace(/\bbreastplate\b/gi, "coraza")
    .replace(/\bsplint\b/gi, "tablillas")
    .replace(/\bleather\b/gi, "cuero")
    .replace(/\bgray\b/gi, "gris")
    .replace(/\brust\b/gi, "oxido")
    .replace(/\btan\b/gi, "canela")
    .replace(/\bsilver raven\b/gi, "cuervo de plata");

  for (const [source, target] of LOOT_PHRASE_ES) {
    translated = translated.replaceAll(source, target);
  }

  translated = translated
    .replace(/\bLuck Blade/gi, "Hoja de suerte")
    .replace(/\bDefender/gi, "Defensora")
    .replace(/\bHoly avenger/gi, "Vengadora sagrada")
    .replace(/\bHammer of thunderbolts/gi, "Martillo de rayos")
    .replace(/\bSword of answering/gi, "Espada de respuesta")
    .replace(/\bRing of djinni summoning/gi, "Anillo de invocacion de djinni")
    .replace(/\bRing of invisibility/gi, "Anillo de invisibilidad")
    .replace(/\bRing of spell turning/gi, "Anillo de retorno de conjuros")
    .replace(/\bRod of lordly might/gi, "Vara de poder senorial")
    .replace(/\bArmor,?\s*\+\s*(\d+)/gi, "Armadura, +$1")
    .replace(/\bArmor of resistance/gi, "Armadura de resistencia")
    .replace(/\bArmor/gi, "Armadura")
    .replace(/\bShield/gi, "Escudo")
    .replace(/\bWeapon/gi, "Arma")
    .replace(/\bRing of/gi, "Anillo de")
    .replace(/\bRod of/gi, "Vara de")
    .replace(/\bStaff of/gi, "Baston de")
    .replace(/\bWand of/gi, "Varita de")
    .replace(/\bSword of/gi, "Espada de");

  translated = translated
    .replace(/\bElixir of health/gi, "Elixir de salud")
    .replace(/\bEscudo of missile attraction/gi, "Escudo de atraccion de proyectiles")
    .replace(/\bWings of flying/gi, "Alas de vuelo")
    .replace(/\bAmulet of the planes/gi, "Amuleto de los planos")
    .replace(/\bScimitar of speed/gi, "Cimitarra de velocidad")
    .replace(/\bBelt of fire giant fuerza/gi, "Cinturon de fuerza de gigante de fuego")
    .replace(/\bBelt of frost \(or stone\) giant fuerza/gi, "Cinturon de fuerza de gigante de escarcha (o piedra)")
    .replace(/\bBelt of cloud giant fuerza/gi, "Cinturon de fuerza de gigante de las nubes")
    .replace(/\bBelt of storm giant fuerza/gi, "Cinturon de fuerza de gigante de tormenta")
    .replace(/\bTome of liderazgo and influence/gi, "Tomo de liderazgo e influencia")
    .replace(/\bScarab of proteccion/gi, "Escarabajo de proteccion")
    .replace(/\bApparatus of Kwalish/gi, "Aparato de Kwalish")
    .replace(/\bArmadura of invulnerability/gi, "Armadura de invulnerabilidad")
    .replace(/\bPiedra ioun \(greater absorcion\)/gi, "Piedra ioun (absorcion mayor)")
    .replace(/\barmadura de placas of etherealness/gi, "Armadura de placas de etereidad")
    .replace(/\barmadura de placas of resistance/gi, "Armadura de placas de resistencia");

  return translated;
}

function localizeLootTable(table, language) {
  const isEnglish = language === "en";

  return {
    ...table,
    name: isEnglish ? table.name : table.name.replace(/^Table /, "Tabla "),
    columns: isEnglish ? table.columns : ["d100", "Objeto magico"],
    rows: isEnglish ? table.rows : table.rows.map((row) => row.map((cell, index) => index === 0 ? cell : translateLootCell(cell)))
  };
}

export function getLocalizedLootTableFolders(language = "es") {
  const isEnglish = language === "en";

  return [{
    id: LOOT_TABLE_FOLDER_ID,
    name: isEnglish ? "LOOT TABLES" : "Tablas de botin",
    isExpanded: true
  }];
}

export function getLocalizedLootTableDefinitions(language = "es") {
  const normalizedLanguage = language === "en" ? "en" : "es";
  return LOOT_TABLES_EN.map((table) => localizeLootTable(table, normalizedLanguage));
}
