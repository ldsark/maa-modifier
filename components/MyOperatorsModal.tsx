
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Filter, CheckCircle2, Circle, Download, Upload, FileJson } from 'lucide-react';
import { OPERATOR_DB, CLASS_NAMES_KR } from '../data/operatorDb';
import { OperatorAvatar } from './OperatorAvatar';
import { downloadJson } from '../utils/maaProcessor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ownedOperators: string[];
  setOwnedOperators: (opers: string[]) => void;
}

export const MyOperatorsModal: React.FC<Props> = ({ isOpen, onClose, ownedOperators, setOwnedOperators }) => {
  const [activeRarity, setActiveRarity] = useState<number | 'All'>('All');
  const [activeClass, setActiveClass] = useState<string>('All');
  const [tempOwned, setTempOwned] = useState<Set<string>>(new Set(ownedOperators));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setTempOwned(new Set(ownedOperators));
    }
  }, [isOpen, ownedOperators]);

  const handleSave = () => {
    const newList = Array.from(tempOwned);
    setOwnedOperators(newList);
    localStorage.setItem('maa_owned_operators', JSON.stringify(newList));
    onClose();
  };

  const toggleOp = (name: string) => {
    const next = new Set(tempOwned);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setTempOwned(next);
  };

  const toggleAllVisible = (select: boolean) => {
    const next = new Set(tempOwned);
    filteredOps.forEach(op => {
      if (select) next.add(op.name);
      else next.delete(op.name);
    });
    setTempOwned(next);
  };

  // Export Logic
  const handleExport = () => {
    const data = Array.from(tempOwned);
    downloadJson(data, `maa_owned_operators_${new Date().toISOString().slice(0,10)}.json`);
  };

  // Import Logic
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          setTempOwned(new Set(parsed));
          alert(`성공적으로 ${parsed.length}명의 오퍼레이터 목록을 불러왔습니다.`);
        } else {
          alert('올바르지 않은 JSON 형식입니다. 오퍼레이터 이름의 배열이어야 합니다.');
        }
      } catch (err) {
        console.error(err);
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const filteredOps = OPERATOR_DB.filter(op => {
    const matchRarity = activeRarity === 'All' ? true : (activeRarity === 2 ? op.rarity <= 2 : op.rarity === activeRarity);
    const matchClass = activeClass === 'All' ? true : op.class === activeClass;
    return matchRarity && matchClass;
  });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              보유 오퍼레이터 관리
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              내가 보유한 오퍼레이터를 선택하면 전략 검색 시 보유율을 계산해줍니다.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X /></button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 space-y-3">
          <div className="flex gap-2 flex-wrap">
             {['All', 6, 5, 4, 3, 2].map(r => (
               <button
                 key={r}
                 onClick={() => setActiveRarity(r as any)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeRarity === r ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
               >
                 {r === 'All' ? '전체 등급' : r === 2 ? '1-2성' : `${r}성`}
               </button>
             ))}
             <div className="w-px h-6 bg-slate-800 mx-1 self-center" />
             {['All', ...Object.keys(CLASS_NAMES_KR)].map(c => (
               <button
                 key={c}
                 onClick={() => setActiveClass(c)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeClass === c ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
               >
                 {c === 'All' ? '전체 직군' : CLASS_NAMES_KR[c]}
               </button>
             ))}
          </div>
          
          <div className="flex items-center justify-between">
             <div className="text-xs text-slate-400 font-mono">
                표시된 {filteredOps.length}명 중 <span className="text-green-400">{filteredOps.filter(op => tempOwned.has(op.name)).length}</span>명 선택됨
             </div>
             <div className="flex gap-2">
                <button onClick={() => toggleAllVisible(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300">현재 화면 모두 선택</button>
                <button onClick={() => toggleAllVisible(false)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300">현재 화면 모두 해제</button>
             </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30">
           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredOps.map(op => {
                const isSelected = tempOwned.has(op.name);
                return (
                  <button
                    key={op.id}
                    onClick={() => toggleOp(op.name)}
                    className={`relative group rounded-xl border p-2 flex flex-col items-center gap-2 transition-all overflow-hidden
                      ${isSelected 
                        ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                        : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'}`}
                  >
                    <div className="relative w-12 h-12">
                       <OperatorAvatar name={op.name} className={`${isSelected ? '' : 'grayscale'} transition-all`} />
                       <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 ${isSelected ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          {isSelected ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                       </div>
                    </div>
                    <div className="text-center w-full">
                       <div className={`text-[10px] font-bold truncate w-full ${isSelected ? 'text-green-400' : 'text-slate-400'}`}>{op.name}</div>
                       <div className="text-[9px] text-slate-600">{op.rarity}★</div>
                    </div>
                  </button>
                );
              })}
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row justify-between gap-3">
           <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
              <button 
                onClick={handleImportClick}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <Upload className="w-3.5 h-3.5" /> 가져오기
              </button>
              <button 
                onClick={handleExport}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" /> 내보내기
              </button>
           </div>
           
           <div className="flex gap-3 justify-end">
             <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-colors">취소</button>
             <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95">
               저장하기 ({tempOwned.size}명)
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};
