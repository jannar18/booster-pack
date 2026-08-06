// The original Lumen creature set — Aurora Grove (S1).
// Each creature has an element, rarity weighting, stats, and a shape id used by
// cardArt.js to draw its portrait.

export const ELEMENTS = {
  ember: { name: 'Ember', hue: 18,  main: '#f2762c', light: '#ffd9a8', deep: '#a63c10', gem: '#ff7a30' },
  tide:  { name: 'Tide',  hue: 205, main: '#3b9ce8', light: '#c8e7fb', deep: '#175a94', gem: '#38a2ff' },
  bloom: { name: 'Bloom', hue: 120, main: '#4caf50', light: '#d6f2c8', deep: '#22682c', gem: '#54c458' },
  volt:  { name: 'Volt',  hue: 48,  main: '#f2c022', light: '#fdf0b8', deep: '#a67c08', gem: '#ffd234' },
  umbra: { name: 'Umbra', hue: 275, main: '#8d5fd3', light: '#e2d4f7', deep: '#4d2a85', gem: '#a06ff0' },
  terra: { name: 'Terra', hue: 28,  main: '#b07a4a', light: '#ecd9bf', deep: '#6b4423', gem: '#c98d54' },
};

// rarity: c common, u uncommon, r rare (holo), x ultra (full-art)
export const CREATURES = [
  { id: 'foxling',  name: 'Foxling',  element: 'volt',  hp: 60,  rarity: 'c', shape: 'fox',
    move: { name: 'Spark Tail', cost: 2, dmg: 20 }, flavor: 'Its tail stores morning light and releases it when it leaps.' },
  { id: 'puddlet',  name: 'Puddlet',  element: 'tide',  hp: 60,  rarity: 'c', shape: 'blob',
    move: { name: 'Splash Bop', cost: 1, dmg: 10 }, flavor: 'It naps in shallow streams and dreams of the open sea.' },
  { id: 'cindercub',name: 'Cindercub',element: 'ember', hp: 70,  rarity: 'c', shape: 'cub',
    move: { name: 'Warm Swipe', cost: 2, dmg: 20 }, flavor: 'Cool to the touch until startled — then it glows like a coal.' },
  { id: 'thistlet', name: 'Thistlet', element: 'bloom', hp: 50,  rarity: 'c', shape: 'sprout',
    move: { name: 'Leaf Flick', cost: 1, dmg: 10 }, flavor: 'It plants itself upside-down to listen to the soil.' },
  { id: 'pebblum',  name: 'Pebblum',  element: 'terra', hp: 80,  rarity: 'c', shape: 'golem',
    move: { name: 'Tumble', cost: 3, dmg: 30 }, flavor: 'A cairn that decided to go for a walk one day.' },
  { id: 'wispurr',  name: 'Wispurr',  element: 'umbra', hp: 60,  rarity: 'u', shape: 'cat',
    move: { name: 'Dusk Pounce', cost: 2, dmg: 30 }, flavor: 'Only its eyes are visible at dusk, blinking in pairs.' },
  { id: 'galeon',   name: 'Galeon',   element: 'tide',  hp: 90,  rarity: 'u', shape: 'ray',
    move: { name: 'Tide Wing', cost: 3, dmg: 40 }, flavor: 'It surfs the underside of waves like a silver kite.' },
  { id: 'emberoak', name: 'Emberoak', element: 'ember', hp: 110, rarity: 'r', shape: 'stag',
    move: { name: 'Antler Flare', cost: 3, dmg: 60 }, flavor: 'Each autumn its antlers kindle and shed like leaves of fire.' },
  { id: 'lunavis',  name: 'Lunavis',  element: 'umbra', hp: 100, rarity: 'r', shape: 'owl',
    move: { name: 'Moonbeam', cost: 3, dmg: 50 }, flavor: 'It preens starlight into its feathers before every flight.' },
  { id: 'solstice', name: 'Solstice', element: 'volt',  hp: 130, rarity: 'x', shape: 'fox',
    move: { name: 'Radiant Burst', cost: 4, dmg: 90 }, flavor: 'Legends say the first dawn was a Solstice stretching awake.' },
];

export const RARITY_ORDER = { c: 0, u: 1, r: 2, x: 3 };
export const RARITY_LABEL = { c: 'Common', u: 'Uncommon', r: 'Rare', x: 'Ultra Rare' };

// Draw 5 cards: slots 1–3 commons, slot 4 common/uncommon, slot 5 weighted rare chances.
export function drawPack(rand) {
  const commons = CREATURES.filter((c) => c.rarity === 'c');
  const uncommons = CREATURES.filter((c) => c.rarity === 'u');
  const rares = CREATURES.filter((c) => c.rarity === 'r');
  const ultras = CREATURES.filter((c) => c.rarity === 'x');
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const cards = [pick(commons), pick(commons), pick(commons)];
  cards.push(rand() < 0.6 ? pick(uncommons) : pick(commons));
  const roll = rand();
  if (roll < 0.12) cards.push(pick(ultras));
  else if (roll < 0.55) cards.push(pick(rares));
  else cards.push(pick(uncommons));
  return cards;
}
