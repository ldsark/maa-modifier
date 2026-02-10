
import { MaaConfig, ReplacementMap, MaaOperator, MaaGroup, CategorizedOperators } from '../types';
import { findOperatorEntry } from '../data/operatorDb';

/**
 * Extracts operators categorized into Groups and Standalone.
 */
export const extractCategorizedOperators = (config: MaaConfig): CategorizedOperators => {
  const groups: MaaGroup[] = config.groups ? JSON.parse(JSON.stringify(config.groups)) : [];
  const groupedNames = new Set<string>();
  
  groups.forEach(g => {
    g.opers?.forEach(op => {
      groupedNames.add(typeof op === 'string' ? op : op.name);
    });
  });

  const singlesSet = new Set<string>();
  if (config.opers) {
    config.opers.forEach(op => {
      if (!groupedNames.has(op.name)) singlesSet.add(op.name);
    });
  }
  
  if (config.actions) {
    config.actions.forEach(a => {
      if (a.name && a.type === 'Deploy' && !groupedNames.has(a.name)) {
        // Check if this name is actually a group name
        const isGroup = groups.some(g => g.name === a.name);
        if (!isGroup) singlesSet.add(a.name);
      }
    });
  }

  return {
    groups,
    singles: Array.from(singlesSet)
  };
};

/**
 * Resolve display name to CN name for JSON export.
 * Note: MAA expects the internal Chinese names (CN names) for consistency in its logic.
 */
export const resolveToInternalName = (name: string): string => {
  const entry = findOperatorEntry(name);
  return entry?.cnName || name;
};

/**
 * Helper to get the display Korean name.
 */
export const resolveToKoreanName = (name: string): string => {
  const entry = findOperatorEntry(name);
  return entry?.name || name;
};

export const applyReplacements = (config: MaaConfig, map: ReplacementMap): MaaConfig => {
  const newConfig: MaaConfig = JSON.parse(JSON.stringify(config));

  // 1. Update Groups
  if (newConfig.groups) {
    newConfig.groups.forEach(group => {
      if (group.opers) {
        group.opers = group.opers.map(op => {
          const originalName = typeof op === 'string' ? op : op.name;
          const path = `${group.name}:${originalName}`;
          
          if (map[path]) {
            const r = map[path];
            return {
              name: resolveToInternalName(r.newName),
              skill: r.skill,
              skill_usage: r.skill_usage,
              skill_times: r.skill_usage === 2 ? r.skill_times : undefined
            };
          }
          
          if (typeof op === 'object') {
            op.name = resolveToInternalName(op.name);
            return op;
          }
          return resolveToInternalName(op);
        });
      }
    });
  }

  // 2. Update Main Opers
  if (newConfig.opers) {
    newConfig.opers.forEach(op => {
      if (map[op.name]) {
        const r = map[op.name];
        op.name = resolveToInternalName(r.newName);
        op.skill = r.skill;
        op.skill_usage = r.skill_usage;
        if (r.skill_usage === 2) {
            op.skill_times = r.skill_times;
        } else {
            delete op.skill_times;
        }
      } else {
        op.name = resolveToInternalName(op.name);
      }
    });
  }

  // 3. Update Actions
  if (newConfig.actions) {
    newConfig.actions.forEach(a => {
      if (a.name) {
        if (map[a.name]) {
          a.name = resolveToInternalName(map[a.name].newName);
        } else {
          const group = newConfig.groups?.find(g => g.name === a.name);
          if (!group) {
             a.name = resolveToInternalName(a.name);
          }
        }
      }
    });
  }

  return newConfig;
};

export const downloadJson = (data: object, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
