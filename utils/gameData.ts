
import { setOperatorDb, OPERATOR_DB } from '../data/operatorDb';
import { OperatorDbEntry } from '../types';

interface CharacterTable {
  [key: string]: {
    name: string;
    appellation: string; // English Name
    profession: string;
    rarity: string | number;
    subProfessionId: string;
    [key: string]: any;
  };
}

const CACHE_KEY = 'maa_copilot_gamedata_v6'; // Bump version
const TRANSLATION_KEY = 'maa_custom_translations';
const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 Hour cache

// Maps for quick lookup
let nameToIdMap: Record<string, string> = {};
let idToAvatarMap: Record<string, string> = {};
let customTranslations: Record<string, string> = {};

const PROF_MAP: Record<string, 'Vanguard' | 'Guard' | 'Defender' | 'Sniper' | 'Caster' | 'Medic' | 'Supporter' | 'Specialist'> = {
  'PIONEER': 'Vanguard',
  'WARRIOR': 'Guard',
  'TANK': 'Defender',
  'SNIPER': 'Sniper',
  'CASTER': 'Caster',
  'MEDIC': 'Medic',
  'SUPPORT': 'Supporter',
  'SPECIAL': 'Specialist',
};

const RARITY_MAP: Record<string, number> = {
  'TIER_1': 1,
  'TIER_2': 2,
  'TIER_3': 3,
  'TIER_4': 4,
  'TIER_5': 5,
  'TIER_6': 6,
};

// Robust fetch helper with fallback and cache busting
const fetchWithFallback = async (url1: string, url2: string): Promise<any> => {
    const timestamp = new Date().getTime();
    const addTs = (u: string) => u.includes('?') ? `${u}&_t=${timestamp}` : `${u}?_t=${timestamp}`;

    try {
        const res = await fetch(addTs(url1));
        if (!res.ok) throw new Error("Primary failed");
        return await res.json();
    } catch (e) {
        console.warn(`Primary source failed, trying backup: ${url2}`);
        const res = await fetch(addTs(url2));
        return await res.json();
    }
};

export const loadCustomTranslations = () => {
  try {
    const stored = localStorage.getItem(TRANSLATION_KEY);
    if (stored) {
      customTranslations = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load translations", e);
  }
};

export const saveCustomTranslations = (newTranslations: Record<string, string>) => {
  customTranslations = { ...customTranslations, ...newTranslations };
  localStorage.setItem(TRANSLATION_KEY, JSON.stringify(customTranslations));
  
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    processGameData(parsed.data);
  }
};

export const initializeGameData = async (forceUpdate = false): Promise<void> => {
  try {
    loadCustomTranslations();

    // 1. Check Cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (!forceUpdate && cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
           processGameData(parsed.data);
           console.log("Game data loaded from cache");
           return;
        }
      } catch (e) {
        console.warn("Cache invalid", e);
      }
    }

    console.log("Fetching fresh game data...");
    
    // 2. Fetch CN Data (Base)
    const cnData: CharacterTable = await fetchWithFallback(
        'https://cdn.jsdelivr.net/gh/Kengxxiao/ArknightsGameData@master/zh_CN/gamedata/excel/character_table.json',
        'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json'
    );

    // 3. Fetch KR Data (Target)
    let krData: CharacterTable = {};
    try {
        krData = await fetchWithFallback(
            'https://cdn.jsdelivr.net/gh/Kengxxiao/ArknightsGameData@master/ko_KR/gamedata/excel/character_table.json',
            'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/ko_KR/gamedata/excel/character_table.json'
        );
    } catch (e) {
        console.warn("Failed to fetch KR data completely", e);
    }

    // 4. Merge Data
    const mergedList: OperatorDbEntry[] = [];
    
    Object.entries(cnData).forEach(([id, char]) => {
      // Filter out non-character entities
      if (!char.profession || char.profession.startsWith('TRAP') || char.profession.startsWith('TOKEN')) return;
      
      const krChar = krData[id];
      const cnName = char.name;
      const appellation = char.appellation; // English Name

      let initialName = krChar ? krChar.name : (appellation && appellation.length > 0 ? appellation : cnName);

      const profession = PROF_MAP[char.profession];
      if (!profession) return;

      let rarity = 1;
      if (typeof char.rarity === 'string' && RARITY_MAP[char.rarity]) {
        rarity = RARITY_MAP[char.rarity];
      } else if (typeof char.rarity === 'number') {
        rarity = char.rarity + 1;
      }

      mergedList.push({
        id,
        name: initialName, 
        cnName: cnName,
        appellation: appellation,
        class: profession,
        rarity
      });
    });

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: mergedList
    }));

    // Update Global DB
    processGameData(mergedList);

  } catch (error) {
    console.error('Error loading game data:', error);
  }
};

const processGameData = (list: OperatorDbEntry[]) => {
    // Apply Custom Translations
    const finalizedList = list.map(op => {
      if (customTranslations[op.id]) {
        return { ...op, name: customTranslations[op.id] };
      }
      return op;
    });

    setOperatorDb(finalizedList);
    
    // Rebuild local maps
    nameToIdMap = {};
    idToAvatarMap = {};
    
    finalizedList.forEach(op => {
        nameToIdMap[op.name] = op.id;
        if (op.cnName) nameToIdMap[op.cnName] = op.id;
        if (op.appellation) nameToIdMap[op.appellation] = op.id;
        nameToIdMap[op.id] = op.id;
        
        // Switch to Yuanyan3060 via jsDelivr for maximum stability and speed
        idToAvatarMap[op.id] = `https://cdn.jsdelivr.net/gh/Yuanyan3060/Arknights-Bot-Resource@main/avatar/${encodeURIComponent(op.id)}.png`;
    });
};

export const getCharId = (name: string): string | undefined => {
  return nameToIdMap[name];
};

export const getAvatarUrl = (nameOrId: string): string => {
  if (idToAvatarMap[nameOrId]) return idToAvatarMap[nameOrId];

  const id = nameToIdMap[nameOrId];
  if (id && idToAvatarMap[id]) return idToAvatarMap[id];
  
  if (nameOrId.startsWith('char_')) {
      return `https://cdn.jsdelivr.net/gh/Yuanyan3060/Arknights-Bot-Resource@main/avatar/${encodeURIComponent(nameOrId)}.png`;
  }

  return '';
};

export const getUntranslatedOperators = (): OperatorDbEntry[] => {
  return OPERATOR_DB.filter(op => {
      const isCn = op.name === op.cnName && /[\u4e00-\u9fa5]/.test(op.name);
      const isEn = op.name === op.appellation && /^[A-Za-z0-9\s'\-]+$/.test(op.name);
      return isCn || isEn;
  });
};
