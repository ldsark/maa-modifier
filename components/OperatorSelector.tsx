
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Star, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { OPERATOR_DB, CLASS_NAMES_KR, SKILL_USAGE_OPTIONS } from '../data/operatorDb';
import { ReplacementConfig } from '../types';
import { OperatorAvatar } from './OperatorAvatar';
import { resolveToKoreanName } from '../utils/maaProcessor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (config: ReplacementConfig) => void;
  originalName: string;
  initialData?: {
    name: string; // The currently active name (could be replacement)
    skill: number;
    skill_usage: number;
    skill_times?: number;
  };
  stageName?: string;
  ownedOperators?: string[];
  isAddMode?: boolean;
}

export const OperatorSelector: React.FC<Props> = ({ isOpen, onClose, onSelect, originalName, initialData, stageName, ownedOperators = [], isAddMode = false }) => {
  const [activeClass, setActiveClass] = useState<string>('All');
  const [activeRarity, setActiveRarity] = useState<number | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [prioritizeOwned, setPrioritizeOwned] = useState(false);
  
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [skill, setSkill] = useState(1);
  const [usage, setUsage] = useState(1);
  const [skillTimes, setSkillTimes] = useState(1);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Load cached preference for prioritization
      const cachedPriority = localStorage.getItem('maa_pref_prioritize_owned');
      if (cachedPriority !== null) {
        setPrioritizeOwned(cachedPriority === 'true');
      } else {
        // Default to true if user has owned operators and no history
        setPrioritizeOwned(ownedOperators.length > 0);
      }

      if (initialData) {
        setSelectedOp(initialData.name);
        setSkill(initialData.skill);
        setUsage(initialData.skill_usage);
        setSkillTimes(initialData.skill_times || 1);
      } else {
        setSearchTerm('');
        setActiveClass('All');
        setActiveRarity('All');
        setSelectedOp(null);
        setSkill(1);
        setUsage(1);
        setSkillTimes(1);
        
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, initialData, ownedOperators.length]);

  const handleTogglePrioritizeOwned = () => {
    const newValue = !prioritizeOwned;
    setPrioritizeOwned(newValue);
    localStorage.setItem('maa_pref_prioritize_owned', String(newValue));
  };

  if (!isOpen) return null;

  const classes = ['All', ...Object.keys(CLASS_NAMES_KR)];
  const rarities = ['All', 6, 5, 4, 3, 2];

  const filteredOps = OPERATOR_DB.filter(op => {
    const matchesClass = activeClass === 'All' || op.class === activeClass;
    const matchesRarity = activeRarity === 'All' 
        ? true 
        : activeRarity === 2 
          ? op.rarity <= 2 
          : op.rarity === activeRarity;
    
    const matchesSearch = op.name.includes(searchTerm) || 
                          (CLASS_NAMES_KR[op.class] || '').includes(searchTerm);
    return matchesClass && matchesRarity && matchesSearch;
  }).sort((a, b) => {
     if (prioritizeOwned && ownedOperators.length > 0) {
         const aOwned = ownedOperators.includes(a.name);
         const bOwned = ownedOperators.includes(b.name);
         if (aOwned && !bOwned) return -1;
         if (!aOwned && bOwned) return 1;
     }
     // Stable sort logic handled by OPERATOR_DB's intrinsic order (Rarity DESC) if equal
     return 0;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              {isAddMode ? '오퍼레이터 추가' : (initialData ? '설정 편집' : '오퍼레이터 교체')}
              {initialData && <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded">EDIT MODE</span>}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isAddMode 
                ? '그룹에 새로 추가할 대원을 선택하고 스킬을 설정하세요.' 
                : (initialData ? '현재 오퍼레이터의 스킬 및 사용 설정을 변경합니다.' : '대신 사용할 대원을 선택하고 스킬 설정을 완료하세요.')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X /></button>
        </div>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          {/* List Section */}
          <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden relative">
            <div className="p-4 bg-slate-900/30 space-y-4 border-b border-slate-800">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                 <input 
                   ref={inputRef}
                   type="text" 
                   placeholder="대원 이름 검색..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none transition-all"
                 />
               </div>
               
               <div className="space-y-3">
                 <div className="flex gap-1.5 flex-wrap items-center">
                    {rarities.map(r => (
                      <button
                        key={r}
                        onClick={() => setActiveRarity(r as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border flex items-center gap-1
                          ${activeRarity === r 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/50' 
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                      >
                        {r === 'All' ? 'ALL' : r === 2 ? '1-2' : r}
                        {r !== 'All' && <Star className="w-2.5 h-2.5 fill-current" />}
                      </button>
                    ))}
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-800 mx-1"></div>

                    {/* Owned Priority Toggle */}
                    {ownedOperators.length > 0 && (
                        <button
                            onClick={handleTogglePrioritizeOwned}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border flex items-center gap-1.5
                              ${prioritizeOwned 
                                ? 'bg-green-500/10 text-green-500 border-green-500/50' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                        >
                            <CheckCircle2 className="w-3 h-3" />
                            보유 오퍼 우선
                        </button>
                    )}
                 </div>

                 <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                   {classes.map(cls => (
                     <button
                       key={cls}
                       onClick={() => setActiveClass(cls)}
                       className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border whitespace-nowrap
                         ${activeClass === cls 
                           ? 'bg-cyan-500 text-slate-900 border-cyan-500' 
                           : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                     >
                       {cls === 'All' ? 'ALL' : CLASS_NAMES_KR[cls]}
                     </button>
                   ))}
                 </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-950/20">
              {/* Standard List */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredOps.map(op => {
                    const isOwned = ownedOperators.length === 0 || ownedOperators.includes(op.name);
                    return (
                      <button
                        key={op.id}
                        onClick={() => setSelectedOp(op.name)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all 
                          ${selectedOp === op.name 
                              ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-900/10' 
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'}
                          ${!isOwned && ownedOperators.length > 0 ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                        `}
                      >
                        <OperatorAvatar name={op.name} size="sm" className="bg-slate-950 shrink-0" />
                        <div className="text-left overflow-hidden min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-white font-bold truncate">{op.name}</p>
                            <span className="text-[9px] text-amber-500 font-mono shrink-0">
                              {op.rarity}★
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{CLASS_NAMES_KR[op.class]}</p>
                        </div>
                      </button>
                    );
                })}
              </div>
            </div>
          </div>

          {/* Config Section */}
          <div className="w-full lg:w-[350px] p-6 bg-slate-900/50 flex flex-col">
             {!selectedOp ? (
               <div className="flex-grow flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                    <Search className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium">{isAddMode ? '추가할 대원을 선택해주세요' : '교체할 대원을 선택해주세요'}</p>
               </div>
             ) : (
               <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                 <div className="flex-grow">
                     <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl text-center flex flex-col items-center gap-2 mb-6">
                        {/* Force re-render with key to fix image loading glitches */}
                        <OperatorAvatar key={selectedOp} name={selectedOp} size="lg" className="shadow-2xl ring-4 ring-cyan-500/20" />
                        <div>
                            <span className="text-slate-500 text-xs uppercase font-bold block mb-1">SELECTED</span>
                            <span className="text-xl font-black text-white">{selectedOp}</span>
                            {/* If selected op is different from original name, show we are replacing */}
                            {!isAddMode && resolveToKoreanName(originalName) !== selectedOp && (
                                <div className="text-xs text-amber-500 mt-1 flex items-center justify-center gap-1">
                                    <span>(Replaces {resolveToKoreanName(originalName)})</span>
                                </div>
                            )}
                            {isAddMode && (
                                <div className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
                                    <span>(New Addition)</span>
                                </div>
                            )}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div>
                          <label className="text-[10px] text-slate-500 font-black uppercase mb-2 block">Skill</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(num => (
                              <button key={num} onClick={() => setSkill(num)} className={`py-3 rounded-xl text-xs font-bold border transition-all ${skill === num ? 'bg-cyan-500 text-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                                스킬 {num}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-black uppercase mb-2 block">Usage</label>
                          <select 
                            value={usage}
                            onChange={e => setUsage(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-300 focus:border-cyan-500 outline-none transition-all"
                          >
                            {SKILL_USAGE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          
                          {/* Skill Times Config (Only when Usage is 2) */}
                          {usage === 2 && (
                             <div className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800 animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-[10px] text-slate-400 font-bold uppercase">사용 횟수 (Times)</label>
                                  <span className="text-xs font-mono text-cyan-400 font-bold">{skillTimes}회</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <button 
                                     onClick={() => setSkillTimes(Math.max(1, skillTimes - 1))}
                                     className="w-10 h-10 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                                   >
                                     <Minus className="w-4 h-4" />
                                   </button>
                                   <div className="flex-1 h-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center font-mono text-lg text-white font-bold">
                                      {skillTimes}
                                   </div>
                                   <button 
                                     onClick={() => setSkillTimes(skillTimes + 1)}
                                     className="w-10 h-10 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                                   >
                                     <Plus className="w-4 h-4" />
                                   </button>
                                </div>
                             </div>
                          )}
                        </div>
                     </div>
                 </div>

                 <button 
                   onClick={() => onSelect({ newName: selectedOp, skill, skill_usage: usage, skill_times: usage === 2 ? skillTimes : undefined })}
                   className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-900/20 transition-all active:scale-[0.98] mt-auto"
                 >
                   설정 저장
                 </button>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
