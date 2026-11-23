// Ediciones (expansiones) de Pokémon TCG que el recolector sabe reconocer.
// Para agregar una nueva: copia una línea y completa id, nombres y alias.
//  - aliases: textos que pueden aparecer en el título/etiquetas (sin tildes, en minúsculas).
//  - codes:   códigos de set (ej. "sv3pt5") que algunas tiendas usan.
//  - total:   número impreso del set (ej. 165 en "003/165"); sólo se usa si no hay ambigüedad.
//  - generic: true para sets cuyo nombre aparece dentro de otros (ej. "Scarlet & Violet").
//  - order:   número para ordenar (más alto = más nuevo).

export const SETS = [
  // ── Mega Evolución ──────────────────────────────────────────────
  { id: 'delta-reign', en: 'Delta Reign', es: 'Delta Reign', era: 'Mega Evolución', order: 409, aliases: ['delta reign'] },
  { id: 'pitch-black', en: 'Pitch Black', es: 'Pitch Black', era: 'Mega Evolución', order: 408, aliases: ['pitch black'] },
  { id: 'chaos-rising', en: 'Chaos Rising', es: 'Caos Creciente', era: 'Mega Evolución', order: 407, aliases: ['chaos rising', 'caos creciente'] },
  { id: '30th-celebration', en: '30th Celebration', es: '30 Aniversario', era: 'Mega Evolución', order: 406, aliases: ['30th celebration', '30th anniversary', '30 aniversario', 'celebracion 30', '30 celebration'] },
  { id: 'perfect-order', en: 'Perfect Order', es: 'Orden Perfecto', era: 'Mega Evolución', order: 405, total: 88, aliases: ['perfect order', 'orden perfecto', 'equilibrio perfecto'] },
  { id: 'ascended-heroes', en: 'Ascended Heroes', es: 'Héroes Ascendidos', era: 'Mega Evolución', order: 404, total: 217, aliases: ['ascended heroes', 'heroes ascendidos', 'ascenso heroico', 'heroes ascendentes'] },
  { id: 'phantasmal-flames', en: 'Phantasmal Flames', es: 'Llamas Fantasmales', era: 'Mega Evolución', order: 403, total: 94, aliases: ['phantasmal flames', 'llamas fantasmales'] },
  { id: 'mega-evolution', en: 'Mega Evolution', es: 'Megaevolución', era: 'Mega Evolución', order: 402, total: 132, generic: true, aliases: ['mega evolution', 'megaevolucion', 'mega evolucion'], codes: ['me01', 'me1'] },

  // ── Escarlata y Púrpura ─────────────────────────────────────────
  { id: 'black-bolt-white-flare', en: 'Black Bolt / White Flare', es: 'Rayo Negro / Llama Blanca', era: 'Escarlata y Púrpura', order: 312, aliases: ['black bolt', 'white flare', 'blackbolt', 'whiteflare', 'rayo negro', 'llama blanca'], codes: ['sv10pt5', 'zsv10pt5', 'rsv10pt5', 'sv10.5'] },
  { id: 'destined-rivals', en: 'Destined Rivals', es: 'Rivales Predestinados', era: 'Escarlata y Púrpura', order: 311, aliases: ['destined rivals', 'rivales predestinados'], codes: ['sv10'] },
  { id: 'journey-together', en: 'Journey Together', es: 'Aventuras Compartidas', era: 'Escarlata y Púrpura', order: 310, aliases: ['journey together', 'aventuras compartidas'], codes: ['sv9'] },
  { id: 'prismatic-evolutions', en: 'Prismatic Evolutions', es: 'Evoluciones Prismáticas', era: 'Escarlata y Púrpura', order: 309, total: 131, aliases: ['prismatic evolutions', 'prismatic evolution', 'evoluciones prismaticas'], codes: ['sv8pt5', 'sv8.5'] },
  { id: 'surging-sparks', en: 'Surging Sparks', es: 'Chispas Fulgurantes', era: 'Escarlata y Púrpura', order: 308, total: 191, aliases: ['surging sparks', 'chispas fulgurantes'], codes: ['sv8'] },
  { id: 'stellar-crown', en: 'Stellar Crown', es: 'Corona Astral', era: 'Escarlata y Púrpura', order: 307, total: 142, aliases: ['stellar crown', 'corona astral'], codes: ['sv7'] },
  { id: 'shrouded-fable', en: 'Shrouded Fable', es: 'Fábula Sombría', era: 'Escarlata y Púrpura', order: 306, total: 64, aliases: ['shrouded fable', 'fabula sombria'], codes: ['sv6pt5', 'sv6.5'] },
  { id: 'twilight-masquerade', en: 'Twilight Masquerade', es: 'Mascarada Crepuscular', era: 'Escarlata y Púrpura', order: 305, total: 167, aliases: ['twilight masquerade', 'mascarada crepuscular'], codes: ['sv6'] },
  { id: 'temporal-forces', en: 'Temporal Forces', es: 'Fuerzas Temporales', era: 'Escarlata y Púrpura', order: 304, total: 162, aliases: ['temporal forces', 'fuerzas temporales', 'temp forces'], codes: ['sv5'] },
  { id: 'paldean-fates', en: 'Paldean Fates', es: 'Destinos de Paldea', era: 'Escarlata y Púrpura', order: 303, total: 91, aliases: ['paldean fates', 'destinos de paldea'], codes: ['sv4pt5', 'sv4.5'] },
  { id: 'paradox-rift', en: 'Paradox Rift', es: 'Brecha Paradójica', era: 'Escarlata y Púrpura', order: 302, aliases: ['paradox rift', 'brecha paradojica'], codes: ['sv4'] },
  { id: '151', en: '151', es: '151', era: 'Escarlata y Púrpura', order: 301, total: 165, aliases: ['151', 'pokemon 151', 'coleccion 151'], codes: ['sv3pt5', 'sv3.5'] },
  { id: 'obsidian-flames', en: 'Obsidian Flames', es: 'Llamas Obsidianas', era: 'Escarlata y Púrpura', order: 300, total: 197, aliases: ['obsidian flames', 'llamas obsidianas'], codes: ['sv3'] },
  { id: 'paldea-evolved', en: 'Paldea Evolved', es: 'Evoluciones en Paldea', era: 'Escarlata y Púrpura', order: 299, total: 193, aliases: ['paldea evolved', 'evoluciones en paldea'], codes: ['sv2'] },
  { id: 'scarlet-violet', en: 'Scarlet & Violet', es: 'Escarlata y Púrpura', era: 'Escarlata y Púrpura', order: 298, generic: true, aliases: ['scarlet & violet', 'scarlet and violet', 'scarlet violet', 'escarlata y purpura', 'escarlata purpura'], codes: ['sv1', 'sv01'] },

  // ── Espada y Escudo ─────────────────────────────────────────────
  { id: 'crown-zenith', en: 'Crown Zenith', es: 'Cenit Supremo', era: 'Espada y Escudo', order: 215, aliases: ['crown zenith', 'cenit supremo'] },
  { id: 'silver-tempest', en: 'Silver Tempest', es: 'Tempestad Plateada', era: 'Espada y Escudo', order: 214, total: 195, aliases: ['silver tempest', 'tempestad plateada'] },
  { id: 'lost-origin', en: 'Lost Origin', es: 'Origen Perdido', era: 'Espada y Escudo', order: 213, total: 196, aliases: ['lost origin', 'origen perdido'] },
  { id: 'pokemon-go', en: 'Pokémon GO', es: 'Pokémon GO', era: 'Espada y Escudo', order: 212, aliases: ['pokemon go'] },
  { id: 'astral-radiance', en: 'Astral Radiance', es: 'Resplandor Astral', era: 'Espada y Escudo', order: 211, total: 189, aliases: ['astral radiance', 'resplandor astral'] },
  { id: 'brilliant-stars', en: 'Brilliant Stars', es: 'Astros Brillantes', era: 'Espada y Escudo', order: 210, total: 172, aliases: ['brilliant stars', 'astros brillantes'] },
  { id: 'fusion-strike', en: 'Fusion Strike', es: 'Golpe Fusión', era: 'Espada y Escudo', order: 209, total: 264, aliases: ['fusion strike', 'golpe fusion'] },
  { id: 'celebrations', en: 'Celebrations', es: 'Celebraciones', era: 'Espada y Escudo', order: 208, aliases: ['celebrations', 'celebraciones', '25th anniversary', '25 aniversario'] },
  { id: 'evolving-skies', en: 'Evolving Skies', es: 'Cielos Evolutivos', era: 'Espada y Escudo', order: 207, total: 203, aliases: ['evolving skies', 'cielos evolutivos'] },
  { id: 'chilling-reign', en: 'Chilling Reign', es: 'Reinado Escalofriante', era: 'Espada y Escudo', order: 206, aliases: ['chilling reign', 'reinado escalofriante'] },
  { id: 'battle-styles', en: 'Battle Styles', es: 'Estilos de Combate', era: 'Espada y Escudo', order: 205, total: 163, aliases: ['battle styles', 'estilos de combate'] },
  { id: 'shining-fates', en: 'Shining Fates', es: 'Destinos Brillantes', era: 'Espada y Escudo', order: 204, aliases: ['shining fates', 'destinos brillantes'] },
  { id: 'vivid-voltage', en: 'Vivid Voltage', es: 'Voltaje Vívido', era: 'Espada y Escudo', order: 203, total: 185, aliases: ['vivid voltage', 'voltaje vivido'] },
  { id: 'champions-path', en: "Champion's Path", es: 'Camino de Campeones', era: 'Espada y Escudo', order: 202, aliases: ["champion's path", 'champions path', 'camino de campeones'] },
  { id: 'darkness-ablaze', en: 'Darkness Ablaze', es: 'Oscuridad Incandescente', era: 'Espada y Escudo', order: 201, aliases: ['darkness ablaze', 'oscuridad incandescente'] },
  { id: 'rebel-clash', en: 'Rebel Clash', es: 'Choque Rebelde', era: 'Espada y Escudo', order: 200, aliases: ['rebel clash', 'choque rebelde'] },
  { id: 'sword-shield', en: 'Sword & Shield', es: 'Espada y Escudo', era: 'Espada y Escudo', order: 199, generic: true, aliases: ['sword & shield', 'sword and shield', 'espada y escudo'] },

  // ── Sol y Luna ──────────────────────────────────────────────────
  { id: 'cosmic-eclipse', en: 'Cosmic Eclipse', es: 'Eclipse Cósmico', era: 'Sol y Luna', order: 160, aliases: ['cosmic eclipse', 'eclipse cosmico'] },
  { id: 'hidden-fates', en: 'Hidden Fates', es: 'Destinos Ocultos', era: 'Sol y Luna', order: 159, aliases: ['hidden fates', 'destinos ocultos'] },
  { id: 'unified-minds', en: 'Unified Minds', es: 'Mentes Unidas', era: 'Sol y Luna', order: 158, aliases: ['unified minds', 'mentes unidas'] },
  { id: 'unbroken-bonds', en: 'Unbroken Bonds', es: 'Vínculos Indestructibles', era: 'Sol y Luna', order: 157, aliases: ['unbroken bonds', 'vinculos indestructibles'] },
  { id: 'team-up', en: 'Team Up', es: 'Unión de Aliados', era: 'Sol y Luna', order: 156, aliases: ['team up', 'union de aliados'] },
  { id: 'lost-thunder', en: 'Lost Thunder', es: 'Truenos Perdidos', era: 'Sol y Luna', order: 155, aliases: ['lost thunder', 'truenos perdidos'] },
  { id: 'dragon-majesty', en: 'Dragon Majesty', es: 'Majestad de Dragones', era: 'Sol y Luna', order: 154, aliases: ['dragon majesty', 'majestad de dragones'] },
  { id: 'celestial-storm', en: 'Celestial Storm', es: 'Tormenta Celestial', era: 'Sol y Luna', order: 153, aliases: ['celestial storm', 'tormenta celestial'] },
  { id: 'forbidden-light', en: 'Forbidden Light', es: 'Luz Prohibida', era: 'Sol y Luna', order: 152, aliases: ['forbidden light', 'luz prohibida'] },
  { id: 'ultra-prism', en: 'Ultra Prism', es: 'Ultraprisma', era: 'Sol y Luna', order: 151, aliases: ['ultra prism', 'ultraprisma'] },
  { id: 'crimson-invasion', en: 'Crimson Invasion', es: 'Invasión Carmesí', era: 'Sol y Luna', order: 150, aliases: ['crimson invasion', 'invasion carmesi'] },
  { id: 'shining-legends', en: 'Shining Legends', es: 'Leyendas Luminosas', era: 'Sol y Luna', order: 149, aliases: ['shining legends', 'leyendas luminosas'] },
  { id: 'burning-shadows', en: 'Burning Shadows', es: 'Sombras Ardientes', era: 'Sol y Luna', order: 148, aliases: ['burning shadows', 'sombras ardientes'] },
  { id: 'guardians-rising', en: 'Guardians Rising', es: 'Albor de Guardianes', era: 'Sol y Luna', order: 147, aliases: ['guardians rising', 'albor de guardianes'] },
  { id: 'sun-moon', en: 'Sun & Moon', es: 'Sol y Luna', era: 'Sol y Luna', order: 146, generic: true, aliases: ['sun & moon', 'sun and moon', 'sol y luna'] },

  // ── XY ──────────────────────────────────────────────────────────
  { id: 'evolutions', en: 'XY Evolutions', es: 'Evoluciones (XY)', era: 'XY', order: 140, aliases: ['xy evolutions', 'evoluciones xy', 'xy: evolutions', 'xy evolution'] },
  { id: 'steam-siege', en: 'Steam Siege', es: 'Asedio de Vapor', era: 'XY', order: 139, aliases: ['steam siege', 'asedio de vapor'] },
  { id: 'fates-collide', en: 'Fates Collide', es: 'Destinos Enfrentados', era: 'XY', order: 138, aliases: ['fates collide', 'destinos enfrentados'] },
  { id: 'generations', en: 'Generations', es: 'Generaciones', era: 'XY', order: 137, aliases: ['generations', 'generaciones'] },
  { id: 'breakpoint', en: 'BREAKpoint', es: 'Turbolímite', era: 'XY', order: 136, aliases: ['breakpoint', 'turbolimite'] },
  { id: 'breakthrough', en: 'BREAKthrough', es: 'Turbo Impacto', era: 'XY', order: 135, aliases: ['breakthrough', 'turbo impacto'] },
  { id: 'ancient-origins', en: 'Ancient Origins', es: 'Orígenes Ancestrales', era: 'XY', order: 134, aliases: ['ancient origins', 'origenes ancestrales'] },
  { id: 'roaring-skies', en: 'Roaring Skies', es: 'Cielos Rugientes', era: 'XY', order: 133, aliases: ['roaring skies', 'cielos rugientes'] },
  { id: 'primal-clash', en: 'Primal Clash', es: 'Duelo Primigenio', era: 'XY', order: 132, aliases: ['primal clash', 'duelo primigenio'] },
  { id: 'xy-base', en: 'XY', es: 'XY', era: 'XY', order: 130, generic: true, aliases: ['xy'] },

  // ── Clásicos ────────────────────────────────────────────────────
  { id: 'aquapolis', en: 'Aquapolis', es: 'Aquapolis', era: 'Clásicos', order: 30, aliases: ['aquapolis'] },
  { id: 'skyridge', en: 'Skyridge', es: 'Skyridge', era: 'Clásicos', order: 31, aliases: ['skyridge'] },
  { id: 'neo-genesis', en: 'Neo Genesis', es: 'Neo Genesis', era: 'Clásicos', order: 20, aliases: ['neo genesis'] },
  { id: 'base-set', en: 'Base Set', es: 'Set Base', era: 'Clásicos', order: 10, aliases: ['base set', 'set base'] },
];

export const SETS_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s]));
