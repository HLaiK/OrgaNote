const REWARDS_BASE = "/rewards";
const STARTER_ITEMS_BASE = `${REWARDS_BASE}/starter%20items`;

export const REWARD_FLOW = {
  CHOOSE_PLANT: "CHOOSE_PLANT",
  CHOOSE_POT: "CHOOSE_POT",
  ADD_SOIL: "ADD_SOIL",
  ADD_SEEDS: "ADD_SEEDS",
  WATER: "WATER",
  GROWING: "GROWING",
  COMPLETE: "GROWTH_COMPLETE",
};

export const STARTER_ITEMS = {
  soilBag: `${STARTER_ITEMS_BASE}/soil.JPG`,
  wateringCan: `${STARTER_ITEMS_BASE}/watering_can.JPG`,
};

export const POTS = [
  {
    id: "pot",
    name: "Classic Pot",
    baseImage: `${STARTER_ITEMS_BASE}/pot.JPG`,
    soilImage: `${STARTER_ITEMS_BASE}/dirty_pot.JPG`,
  },
  {
    id: "tea_cup",
    name: "Tea Cup",
    baseImage: `${STARTER_ITEMS_BASE}/tea_cup.JPG`,
    soilImage: `${STARTER_ITEMS_BASE}/dirty_tea_cup.JPG`,
  },
  {
    id: "glass_tube",
    name: "Glass Tube",
    baseImage: `${STARTER_ITEMS_BASE}/glass_tube.JPG`,
    soilImage: `${STARTER_ITEMS_BASE}/dirty_glass_tube.JPG`,
  },
  {
    id: "old_boot",
    name: "Old Boot",
    baseImage: `${STARTER_ITEMS_BASE}/old_boot.JPG`,
    soilImage: `${STARTER_ITEMS_BASE}/dirty_old_boot.JPG`,
  },
  {
    id: "rain_boot",
    name: "Rain Boot",
    baseImage: `${STARTER_ITEMS_BASE}/rain_boot.JPG`,
    soilImage: `${STARTER_ITEMS_BASE}/dirty_rain_boot.JPG`,
  },
];

const POT_STAGE_PREFIXES = {
  pot: "pot",
  tea_cup: "tea_cup",
  glass_tube: "glass_tube",
  old_boot: "old_boot",
  rain_boot: "rain_boot",
};

const makeStageImages = ({
  folder,
  assetStem,
  extension,
  extensionsByPot,
  stageCount,
}) =>
  Object.fromEntries(
    POTS.map((pot) => [
      pot.id,
      Array.from({ length: stageCount }, (_, index) => {
        const stageNumber = index + 1;
        const resolvedExtension = extensionsByPot?.[pot.id] || extension;
        return `${REWARDS_BASE}/${folder}/${POT_STAGE_PREFIXES[pot.id]}_${assetStem}${stageNumber}.${resolvedExtension}`;
      }),
    ]),
  );

export const PLANTS = [
  {
    id: "blueberry",
    name: "Blueberry",
    folder: "blueberry",
    assetStem: "blueberry",
    icon: `${REWARDS_BASE}/blueberry/blueberry_icon.JPG`,
    seedPacket: `${STARTER_ITEMS_BASE}/blueberry_seeds.JPG`,
    stageCount: 7,
  },
  {
    id: "clover",
    name: "Clover",
    folder: "clover",
    assetStem: "clover",
    icon: `${REWARDS_BASE}/clover/clover_icon.JPG`,
    seedPacket: `${STARTER_ITEMS_BASE}/clover_seeds.JPG`,
    stageCount: 6,
  },
  {
    id: "pothos",
    name: "Pothos",
    folder: "pothos",
    assetStem: "pothos",
    icon: `${REWARDS_BASE}/pothos/pothos_icon.JPG`,
    seedPacket: `${STARTER_ITEMS_BASE}/pothos_seeds.JPG`,
    stageCount: 6,
  },
  {
    id: "snake",
    name: "Snake Plant",
    folder: "snake",
    assetStem: "snake",
    icon: `${REWARDS_BASE}/snake/snake_icon.JPG`,
    seedPacket: `${STARTER_ITEMS_BASE}/snake_seeds.JPG`,
    stageCount: 5,
  },
  {
    id: "strawberry",
    name: "Strawberry",
    folder: "strawberry",
    assetStem: "strawberry",
    icon: `${REWARDS_BASE}/strawberry/strawberry_icon.JPG`,
    seedPacket: `${STARTER_ITEMS_BASE}/strawberry_seeds.JPG`,
    stageCount: 5,
  },
  {
    id: "tomato",
    name: "Tomato",
    folder: "tomatoe",
    assetStem: "tomato",
    icon: `${REWARDS_BASE}/tomatoe/tomato_icon.JPG`,
    seedPacket: `${STARTER_ITEMS_BASE}/tomato_seeds.JPG`,
    stageCount: 7,
    extension: "PNG",
    extensionsByPot: {
      pot: "JPG",
    },
  },
].map((plant) => ({
  ...plant,
  stagesByPot: makeStageImages({
    folder: plant.folder,
    assetStem: plant.assetStem,
    extension: plant.extension || "JPG",
    extensionsByPot: plant.extensionsByPot,
    stageCount: plant.stageCount,
  }),
}));

export const DEFAULT_REWARD_STATE = {
  step: REWARD_FLOW.CHOOSE_PLANT,
  selectedPlantId: null,
  selectedPotId: null,
  growthTasksEarned: 0,
  lastObservedCompletedCount: 0,
  consumedTaskIds: [],
  startedAt: null,
  completedAt: null,
  journalEntryLogged: false,
};

export function getPlantById(plantId) {
  return PLANTS.find((plant) => plant.id === plantId) || null;
}

export function getPotById(potId) {
  return POTS.find((pot) => pot.id === potId) || null;
}

export function getPlantStages(plantId, potId) {
  const plant = getPlantById(plantId);
  if (!plant || !potId) {
    return [];
  }
  return plant.stagesByPot[potId] || [];
}

export function getGrowthGoal(plantId, potId) {
  const stages = getPlantStages(plantId, potId);
  return Math.max(stages.length - 1, 0);
}

export function chunkOptions(options, chunkSize) {
  const chunks = [];
  for (let index = 0; index < options.length; index += chunkSize) {
    chunks.push(options.slice(index, index + chunkSize));
  }
  return chunks;
}
