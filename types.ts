
export interface MaaOperator {
  name: string;
  skill?: number;
  skill_usage?: number;
  skill_times?: number;
  requirements?: {
    skill_level?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface MaaAction {
  name?: string;
  type?: string;
  [key: string]: any;
}

export interface MaaGroup {
  name: string;
  opers?: (string | MaaOperator)[];
  [key: string]: any;
}

export interface MaaConfig {
  stage_name?: string;
  opers?: MaaOperator[];
  groups?: MaaGroup[];
  actions?: MaaAction[];
  doc?: {
    title?: string;
    details?: string;
    author?: string;
    description?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ReplacementConfig {
  newName: string;
  skill: number;
  skill_usage: number;
  skill_times?: number;
}

/**
 * Maps an operator "Path" to a replacement.
 * Path for single op: "name"
 * Path for group op: "groupName:originalName"
 */
export interface ReplacementMap {
  [path: string]: ReplacementConfig;
}

export interface OperatorSuggestion {
  name: string;
  reason: string;
}

export interface OperatorDbEntry {
  id: string;
  name: string;      
  cnName?: string;
  appellation?: string; // English Codename (Crucial for translation)
  class: 'Vanguard' | 'Guard' | 'Defender' | 'Sniper' | 'Caster' | 'Medic' | 'Supporter' | 'Specialist';
  rarity: number;
}

export interface CategorizedOperators {
  groups: MaaGroup[];
  singles: string[]; // standalone operators not in any group
}

// --- Search Related Interfaces ---
export interface StrategySearchResult {
  id: number;
  title: string;
  stage_name: string;
  author: string;
  description: string;
  views: number;
  like: number;
  upload_time: string;
  opers: {
    name: string;
    rarity?: number;
  }[]; // This is the flattened list for UI preview
  
  // Data for "Owned Rate" calculation
  groups?: MaaGroup[]; 
  raw_opers?: MaaOperator[]; // Standalone operators from the strategy JSON

  difficulty?: number;
  rating_level?: number; // 0 to 10 scale from API
}
