
import React, { useState } from 'react';
import { MaaConfig, ReplacementMap, ReplacementConfig, MaaOperator, MaaGroup } from '../types';
import { Search, Download, ArrowLeft, RefreshCw, Users, Folder, Settings2, FileText, User, Languages, Loader2, Key, Plus, ClipboardCopy, Copy, Link, Eye, EyeOff } from 'lucide-react';
import { OperatorSelector } from './OperatorSelector';
import { extractCategorizedOperators, resolveToKoreanName } from '../utils/maaProcessor';
import { OperatorAvatar } from './OperatorAvatar';
import { translateToKorean } from '../services/geminiService';

interface Props {
  config: MaaConfig;
  onUpdateReplacement: (path: string, config: ReplacementConfig | null) => void;
  onAddOperatorToGroup: (groupName: string, config: ReplacementConfig) => void;
  replacements: ReplacementMap;
  description?: string;
  author?: string;
  sourceId?: string;
  onExport: () => void;
  onCopyJSON: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
  ownedOperators: string[];
}

export const OperatorList: React.FC<Props> = ({ config, onUpdateReplacement, onAddOperatorToGroup, replacements, description, author, sourceId, onExport, onCopyJSON, onReset, onOpenSettings, ownedOperators }) => {
  const { groups, singles } = extractCategorizedOperators(config);
  const [activeSelector, setActiveSelector] = useState<{ path: string; name: string; currentConfig: any } | null>(null);
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Persist Highlight Unowned preference
  const [highlightUnowned, setHighlightUnowned] = useState(() => {
    return localStorage.getItem('maa_pref_highlight_unowned') === 'true';
  });

  const toggleHighlightUnowned = () => {
    const newVal = !highlightUnowned;
    setHighlightUnowned(newVal);
    localStorage.setItem('maa_pref_highlight_unowned', String(newVal));
  };
  
  // Translation State (Description only)
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Resolve metadata
  const resolvedDescription = description || config.doc?.details || config.doc?.description || config.description;
  const resolvedAuthor = author || config.doc?.author || config.author;
  
  // Check Difficulty
  const isHard = config.difficulty !== undefined && Number(config.difficulty) > 2;
  
  const handleTranslateDesc = async () => {
    if (!resolvedDescription) return;
    setIsTranslatingDesc(true);
    setTranslationError(null);
    try {
      const result = await translateToKorean(resolvedDescription);
      setTranslatedDesc(result);
    } catch (e: any) {
      if (e.message === "API_KEY_MISSING") {
        setTranslationError("API_KEY_MISSING");
      } else {
        setTranslationError("번역 실패");
      }
    }
    setIsTranslatingDesc(false);
  };

  const handleCopySourceId = async () => {
    if (!sourceId) return;
    const code = `maa://${sourceId}`;
    try {
        await navigator.clipboard.writeText(code);
        alert(`복사되었습니다: ${code}\n(주의: 원본 전략 코드가 복사됩니다. 수정 사항은 JSON 복사를 이용해주세요.)`);
    } catch (e) {
        console.error(e);
        alert("클립보드 복사에 실패했습니다.");
    }
  };

  const getOpInfo = (op: string | MaaOperator, groupName?: string) => {
    const originalInputName = typeof op === 'string' ? op : (op.name || 'Unknown');
    const displayName = resolveToKoreanName(originalInputName);
    const path = groupName ? `${groupName}:${originalInputName}` : originalInputName;
    
    let originalSkill = 1;
    let originalUsage = 1;
    let originalSkillTimes: number | undefined = undefined;

    if (typeof op === 'object') {
      originalSkill = op.skill || 1;
      originalUsage = op.skill_usage ?? 1;
      originalSkillTimes = op.skill_times;
    }

    const replacement = replacements[path];
    return {
      path,
      originalName: originalInputName,
      displayName,
      isModified: !!replacement,
      currentName: replacement ? resolveToKoreanName(replacement.newName) : displayName,
      currentSkill: replacement ? replacement.skill : originalSkill,
      currentUsage: replacement ? replacement.skill_usage : originalUsage,
      currentSkillTimes: replacement && replacement.skill_usage === 2 
          ? replacement.skill_times 
          : (originalUsage === 2 ? originalSkillTimes : undefined)
    };
  };

  const handleQuickSkillChange = (info: any, newSkill: number) => {
    const newConfig: ReplacementConfig = {
      newName: info.isModified && replacements[info.path] ? replacements[info.path].newName : info.originalName,
      skill: newSkill,
      skill_usage: info.currentUsage,
      skill_times: info.currentSkillTimes
    };
    onUpdateReplacement(info.path, newConfig);
  };

  const matchesSearch = (name: string) => {
    if (!name) return false;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4">
      {/* Sticky Header */}
      <div className="sticky top-16 z-40 -mx-4 px-4 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={onReset} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors border border-transparent hover:border-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate flex-1">
            <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white truncate">{config.doc?.title || config.stage_name || "Unknown Strategy"}</h2>
                {isHard && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black bg-red-950 text-red-400 border border-red-500/20 select-none">
                        HARD
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">MAA Copilot</span>
              <span>•</span>
              <span>{groups.length} Groups</span>
              <span>•</span>
              <span>{singles.length} Singles</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="대원 검색..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          
          <button 
            onClick={toggleHighlightUnowned}
            className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap active:scale-95 border
              ${highlightUnowned 
                ? 'bg-amber-950/40 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700 hover:text-slate-200'}`}
            title={highlightUnowned ? "미보유 오퍼레이터 강조 끄기" : "미보유 오퍼레이터 흑백으로 표시"}
          >
            {highlightUnowned ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">미보유</span>
          </button>

          {sourceId && (
            <button 
                onClick={handleCopySourceId} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap active:scale-95"
                title={`원본 전략 코드 복사 (maa://${sourceId})`}
            >
                <Link className="w-4 h-4" />
                <span className="hidden sm:inline">maa://{sourceId}</span>
            </button>
          )}

          <button 
            onClick={onCopyJSON} 
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/30 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap active:scale-95"
            title="수정된 JSON 설정 복사 (MAA에 붙여넣기)"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button onClick={onExport} className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-900/20 whitespace-nowrap active:scale-95">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">저장</span>
          </button>
        </div>
      </div>

      {/* Strategy Description Card */}
      {(resolvedDescription || resolvedAuthor) && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
           <div className="p-4 flex items-start gap-4">
              <div className="p-3 bg-slate-800 rounded-xl text-slate-400 shrink-0">
                 <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                 <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {resolvedAuthor && (
                      <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-lg">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-bold text-slate-300">{resolvedAuthor}</span>
                      </div>
                    )}
                 </div>
                 
                 {resolvedDescription && (
                   <div className="relative group">
                     <div className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${translatedDesc ? 'hidden' : 'block'}`}>
                        {resolvedDescription}
                     </div>
                     {translatedDesc && (
                       <div className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                          {translatedDesc}
                       </div>
                     )}

                     {/* Translate Button */}
                     {!translatedDesc && (
                       <div className="mt-3">
                         <button 
                           onClick={handleTranslateDesc}
                           disabled={isTranslatingDesc}
                           className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                         >
                           {isTranslatingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                           <span>{isTranslatingDesc ? '설명 번역 중...' : '설명 AI 한글 번역'}</span>
                         </button>
                         
                         {translationError === "API_KEY_MISSING" && (
                           <div className="mt-2 flex items-center gap-2 text-[11px] text-red-400 bg-red-950/30 p-2 rounded-lg border border-red-900/30 cursor-pointer hover:bg-red-950/50 transition-colors" onClick={onOpenSettings}>
                              <Key className="w-3.5 h-3.5" />
                              <span>번역하려면 API 키 설정이 필요합니다 (클릭)</span>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Groups (Folder Style) */}
      <div className="grid gap-6">
        {groups.map((group, gIdx) => {
          const visibleOps = group.opers?.filter(op => {
            const name = typeof op === 'string' ? op : (op.name || 'Unknown');
            const koreanName = resolveToKoreanName(name);
            return matchesSearch(name) || matchesSearch(koreanName);
          });

          // Show if matches search OR if no search active (so we can see Add button)
          if (searchTerm && visibleOps?.length === 0) return null;

          return (
            <div key={group.name} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${gIdx * 100}ms` }}>
              <div className="flex items-center gap-3 mb-3 px-1">
                 <div className="p-2 bg-slate-800 rounded-lg text-cyan-400 shadow-md shadow-black/20">
                   <Folder className="w-4 h-4" />
                 </div>
                 <h3 className="text-base font-bold text-slate-200 tracking-tight">{group.name}</h3>
                 <div className="h-px bg-slate-800 flex-grow ml-4"></div>
              </div>
              
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 shadow-xl">
                {/* Compact Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                  {group.opers?.map((op, opIdx) => {
                    const info = getOpInfo(op, group.name);
                    const isOwned = ownedOperators.length === 0 || ownedOperators.includes(info.currentName);

                    if (searchTerm && !matchesSearch(info.displayName) && !matchesSearch(info.originalName)) return null;

                    return (
                      <OperatorCard 
                        key={opIdx}
                        info={info}
                        isOwned={isOwned}
                        highlightUnowned={highlightUnowned}
                        onClick={() => setActiveSelector({ 
                          path: info.path, 
                          name: info.originalName, 
                          currentConfig: {
                            name: info.currentName,
                            skill: info.currentSkill,
                            skill_usage: info.currentUsage,
                            skill_times: info.currentSkillTimes
                          } 
                        })}
                        onQuickSkillChange={(skill) => handleQuickSkillChange(info, skill)}
                        onReset={(e) => { e.stopPropagation(); onUpdateReplacement(info.path, null); }}
                      />
                    );
                  })}
                  
                  {/* Add Operator Button - Only visible when not searching */}
                  {!searchTerm && (
                    <button 
                      onClick={() => setAddingGroup(group.name)}
                      className="relative rounded-lg border-2 border-dashed border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/30 flex flex-col items-center justify-center aspect-square transition-all group/add text-slate-600 hover:text-cyan-400"
                    >
                      <Plus className="w-6 h-6 mb-1 transition-transform group-hover/add:scale-110" />
                      <span className="text-[9px] font-bold">ADD</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Standalone Section */}
        {singles.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-3 mb-3 px-1">
                 <div className="p-2 bg-slate-800 rounded-lg text-indigo-400 shadow-md shadow-black/20">
                   <Users className="w-4 h-4" />
                 </div>
                 <h3 className="text-base font-bold text-slate-200 tracking-tight">개별 오퍼레이터</h3>
                 <div className="h-px bg-slate-800 flex-grow ml-4"></div>
             </div>
             
             <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 shadow-xl">
               <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                 {singles.map(name => {
                   const originalOp = config.opers?.find(op => op.name === name) || name;
                   
                   const info = getOpInfo(originalOp);
                   const isOwned = ownedOperators.length === 0 || ownedOperators.includes(info.currentName);

                   if (searchTerm && !matchesSearch(info.displayName) && !matchesSearch(info.originalName)) return null;

                   return (
                      <OperatorCard 
                        key={name}
                        info={info}
                        isOwned={isOwned}
                        highlightUnowned={highlightUnowned}
                        onClick={() => setActiveSelector({ 
                          path: info.path, 
                          name: info.originalName, 
                          currentConfig: {
                            name: info.currentName,
                            skill: info.currentSkill,
                            skill_usage: info.currentUsage,
                            skill_times: info.currentSkillTimes
                          } 
                        })}
                        onQuickSkillChange={(skill) => handleQuickSkillChange(info, skill)}
                        onReset={(e) => { e.stopPropagation(); onUpdateReplacement(info.path, null); }}
                      />
                   );
                 })}
               </div>
             </div>
          </div>
        )}
      </div>

      {activeSelector && (
        <OperatorSelector 
          isOpen={true}
          originalName={activeSelector.name}
          initialData={activeSelector.currentConfig}
          stageName={config.stage_name}
          onSelect={config => {
            onUpdateReplacement(activeSelector.path, config);
            setActiveSelector(null);
          }}
          onClose={() => setActiveSelector(null)}
          ownedOperators={ownedOperators}
        />
      )}

      {addingGroup && (
        <OperatorSelector 
          isOpen={true}
          isAddMode={true}
          originalName="" 
          stageName={config.stage_name}
          onSelect={config => {
            onAddOperatorToGroup(addingGroup, config);
            setAddingGroup(null);
          }}
          onClose={() => setAddingGroup(null)}
          ownedOperators={ownedOperators}
        />
      )}
    </div>
  );
};

const OperatorCard: React.FC<{
  info: any;
  onClick: () => void;
  onQuickSkillChange: (skill: number) => void;
  onReset: (e: React.MouseEvent) => void;
  isOwned: boolean;
  highlightUnowned: boolean;
}> = ({ info, onClick, onQuickSkillChange, onReset, isOwned, highlightUnowned }) => {
  const getUsageText = (usage: number) => {
    switch (usage) {
      case 0: return '수동';
      case 1: return '자동';
      case 2: return '횟수';
      case 3: return '배치';
      default: return '수동';
    }
  };

  const getUsageColor = (usage: number) => {
    switch (usage) {
      case 1: return 'text-green-400';
      case 2: return 'text-cyan-400';
      case 3: return 'text-cyan-400';
      default: return 'text-slate-500';
    }
  };

  const grayscaleStyle = (highlightUnowned && !isOwned) ? 'grayscale opacity-40' : '';

  return (
    <div 
      className={`relative group rounded-lg border flex flex-col aspect-square bg-slate-950 select-none overflow-hidden transition-all ${grayscaleStyle}
        ${info.isModified 
          ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
          : 'border-slate-800 hover:border-slate-700 hover:shadow-lg'}`}
    >
      {/* Top Part: Image + Skill Column */}
      <div className="flex flex-1 min-h-0 border-b border-slate-800/50">
         {/* Avatar Area (Left) */}
         <div className="flex-1 relative cursor-pointer" onClick={onClick}>
           <OperatorAvatar 
             name={info.currentName} 
             className="!w-full !h-full rounded-none object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
           />
           
           {/* Reset Button */}
           {info.isModified && (
              <button 
                onClick={onReset}
                className="absolute top-1 left-1 w-5 h-5 bg-slate-950/80 backdrop-blur border border-red-500/30 text-red-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-20 shadow-lg"
                title="원래대로 복구"
              >
                <RefreshCw className="w-2.5 h-2.5" />
              </button>
           )}
           
           {/* Edit Hint */}
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
              <Settings2 className="w-4 h-4 text-white drop-shadow-md" />
           </div>
         </div>

         {/* Skill Column (Right, Scaled Down) */}
         <div className="w-8 flex flex-col border-l border-slate-800 bg-slate-900/50">
            {[1, 2, 3].map(skillNum => (
              <button
                key={skillNum}
                onClick={(e) => { e.stopPropagation(); onQuickSkillChange(skillNum); }}
                className={`flex-1 flex items-center justify-center relative transition-colors group/btn
                  ${info.currentSkill === skillNum 
                    ? 'text-cyan-400 bg-slate-900' 
                    : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50'}`}
              >
                <span className={`text-[10px] font-bold ${info.currentSkill === skillNum ? 'scale-110' : ''}`}>
                  {skillNum}
                </span>
                {info.currentSkill === skillNum && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></div>
                )}
              </button>
            ))}
         </div>
      </div>

      {/* Bottom Part: Info (Scaled Down Height) */}
      <div className="h-[34px] px-1.5 flex flex-col justify-center bg-slate-950 cursor-pointer" onClick={onClick}>
         <div className="flex items-center gap-1 w-full mb-px">
            <h4 className={`text-[10px] font-bold truncate leading-tight w-full ${info.isModified ? 'text-amber-400' : 'text-slate-200'}`}>
              {info.currentName}
            </h4>
         </div>
         
         <div className={`text-[9px] font-bold flex items-center gap-1 truncate ${getUsageColor(info.currentUsage)}`}>
             <span className="truncate">{getUsageText(info.currentUsage)}</span>
             {info.currentUsage === 2 && info.currentSkillTimes && (
               <span className="text-cyan-400">x{info.currentSkillTimes}</span>
             )}
         </div>
      </div>
    </div>
  );
};
