
import { OperatorDbEntry } from "../types";

export const CLASS_NAMES_KR: Record<string, string> = {
  Vanguard: "뱅가드",
  Guard: "가드",
  Defender: "디펜더",
  Sniper: "스나이퍼",
  Caster: "캐스터",
  Medic: "메딕",
  Supporter: "서포터",
  Specialist: "스페셜리스트"
};

export const SKILL_USAGE_OPTIONS = [
  { value: 0, label: "사용 안함 / 수동 (Manual)" },
  { value: 1, label: "쿨타임마다 자동 사용 (Auto)" },
  { value: 2, label: "자동 사용 - 횟수 지정 (Times)" },
  { value: 3, label: "배치 시 즉시 사용 (Deploy)" }
];

// Mutable DB populated by utils/gameData.ts
export const OPERATOR_DB: OperatorDbEntry[] = [];

export const setOperatorDb = (newEntries: OperatorDbEntry[]) => {
  OPERATOR_DB.length = 0;
  OPERATOR_DB.push(...newEntries);
  // Sort by Rarity (Desc) then Name (Asc)
  OPERATOR_DB.sort((a, b) => {
    if (a.rarity !== b.rarity) return b.rarity - a.rarity;
    return a.name.localeCompare(b.name, 'ko');
  });
};

export const findOperatorEntry = (name: string): OperatorDbEntry | undefined => {
  if (!name) return undefined;
  const normalized = name.toLowerCase().trim();
  
  // 1. Try Exact Match
  let found = OPERATOR_DB.find(op => 
    op.name === name || 
    op.cnName === name || 
    op.id === name || 
    op.appellation === name
  );
  if (found) return found;

  // 2. Try Case-insensitive Match including Appellation (English Name)
  // This fixes missing images/names when the source file uses "Goldenglow" instead of "골든글로우"
  found = OPERATOR_DB.find(op => 
    op.name.toLowerCase() === normalized || 
    (op.cnName && op.cnName.toLowerCase() === normalized) ||
    (op.appellation && op.appellation.toLowerCase() === normalized) ||
    op.id.toLowerCase() === normalized
  );
  if (found) return found;

  return undefined;
};
