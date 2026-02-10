
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { OperatorList } from './components/OperatorList';
import { StrategySearch } from './components/StrategySearch';
import { SettingsModal } from './components/SettingsModal';
import { MyOperatorsModal } from './components/MyOperatorsModal';
import { MaaConfig, ReplacementMap, ReplacementConfig } from './types';
import { applyReplacements, downloadJson, resolveToInternalName } from './utils/maaProcessor';
import { initializeGameData } from './utils/gameData';
import { Search } from 'lucide-react';

interface FileData {
  name: string;
  content: MaaConfig;
  description?: string;
  author?: string;
  sourceId?: string;
}

const App: React.FC = () => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [replacements, setReplacements] = useState<ReplacementMap>({});
  const [isDataReady, setIsDataReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMyOperatorsOpen, setIsMyOperatorsOpen] = useState(false);
  const [ownedOperators, setOwnedOperators] = useState<string[]>([]);

  useEffect(() => {
    // Load Game Data
    initializeGameData().then(() => {
      setIsDataReady(true);
    });

    // Load Owned Operators
    const storedOwned = localStorage.getItem('maa_owned_operators');
    if (storedOwned) {
      try {
        setOwnedOperators(JSON.parse(storedOwned));
      } catch (e) {
        console.error("Failed to parse owned operators", e);
      }
    }
  }, []);

  const handleFileLoaded = (name: string, content: string, description?: string, author?: string, sourceId?: string) => {
    try {
      let json: MaaConfig;
      if (typeof content === 'object') {
        json = content;
      } else {
        json = JSON.parse(content);
      }

      // Basic validation
      if (!json.opers && !json.actions && !json.stage_name) {
        alert("유효한 MAA 코파일럿 JSON 파일이 아닌 것 같습니다.");
        return;
      }
      
      setFileData({ name, content: json, description, author, sourceId });
      setReplacements({});
    } catch (e) {
      alert("JSON 파일을 분석하는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
      console.error(e);
    }
  };

  const handleUpdateReplacement = (path: string, config: ReplacementConfig | null) => {
    setReplacements(prev => {
      if (!config) {
        const next = { ...prev };
        delete next[path];
        return next;
      }
      return { ...prev, [path]: config };
    });
  };

  const handleAddOperatorToGroup = (groupName: string, config: ReplacementConfig) => {
    if (!fileData) return;

    // Deep clone the current content to modify it safely
    const newContent = JSON.parse(JSON.stringify(fileData.content)); 
    const group = newContent.groups?.find((g: any) => g.name === groupName);
    
    if (group) {
        const newOp: any = {
            name: resolveToInternalName(config.newName),
            skill: config.skill,
            skill_usage: config.skill_usage
        };
        if (config.skill_usage === 2 && config.skill_times) {
            newOp.skill_times = config.skill_times;
        }
        
        if (!group.opers) group.opers = [];
        group.opers.push(newOp);
        
        setFileData({
            ...fileData,
            content: newContent
        });
    }
  };

  const handleExport = () => {
    if (!fileData) return;
    const modifiedConfig = applyReplacements(fileData.content, replacements);
    const newFileName = fileData.name.replace('.json', '_modified.json');
    downloadJson(modifiedConfig, newFileName);
  };

  const handleCopyJSON = async () => {
    if (!fileData) return;
    const modifiedConfig = applyReplacements(fileData.content, replacements);
    try {
      await navigator.clipboard.writeText(JSON.stringify(modifiedConfig, null, 4));
      alert("설정이 클립보드에 복사되었습니다.\nMAA의 '전략 붙여넣기' 또는 'JSON 붙여넣기' 기능을 사용하세요.");
    } catch (err) {
      console.error('Failed to copy!', err);
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  const handleReset = () => {
    setFileData(null);
    setReplacements({});
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-cyan-500/30">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenMyOperators={() => setIsMyOperatorsOpen(true)}
      />
      
      <main className="flex-grow relative">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10 pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-cyan-500/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        {/* Search & DropZone View - Always mounted but hidden when editing */}
        <div className={fileData ? 'hidden' : 'block'}>
          <div className="container mx-auto px-4 py-12 animate-in fade-in zoom-in duration-500">
             <div className="text-center mb-10">
               <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">자동 지휘</span> 설정을 커스텀하세요
               </h2>
               <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
                 스테이지 이름으로 검색하거나 JSON 파일을 업로드하여, <br className="hidden md:block"/>내가 없는 오퍼레이터를 다른 오퍼레이터로 손쉽게 교체할 수 있습니다.
               </p>
             </div>
             
             {/* Strategy Search with Owned Operators Prop */}
             <StrategySearch 
                onLoaded={handleFileLoaded} 
                ownedOperators={ownedOperators}
             />
             
             <DropZone onFileLoaded={handleFileLoaded} />
             
             <div className="max-w-2xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 text-center opacity-80">
               <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50">
                 <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3 text-cyan-400">
                   <Search className="w-5 h-5" />
                 </div>
                 <h3 className="text-slate-200 font-bold mb-1">빠른 검색</h3>
                 <p className="text-slate-500 text-xs">MAA 서버에서 직접 전략 검색</p>
               </div>
               <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50">
                 <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3 text-cyan-400">
                    <span className="text-xl">⚡</span>
                 </div>
                 <h3 className="text-slate-200 font-bold mb-1">오프라인 사용</h3>
                 <p className="text-slate-500 text-xs">앱으로 설치하여 언제든지</p>
               </div>
             </div>
          </div>
        </div>

        {/* Editor View - Rendered only when fileData exists */}
        {fileData && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <OperatorList 
               config={fileData.content} 
               replacements={replacements}
               description={fileData.description}
               author={fileData.author}
               sourceId={fileData.sourceId}
               onUpdateReplacement={handleUpdateReplacement}
               onAddOperatorToGroup={handleAddOperatorToGroup}
               onExport={handleExport}
               onCopyJSON={handleCopyJSON}
               onReset={handleReset}
               onOpenSettings={() => setIsSettingsOpen(true)}
               ownedOperators={ownedOperators}
             />
          </div>
        )}
      </main>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <MyOperatorsModal 
        isOpen={isMyOperatorsOpen} 
        onClose={() => setIsMyOperatorsOpen(false)} 
        ownedOperators={ownedOperators}
        setOwnedOperators={setOwnedOperators}
      />

      <footer className="border-t border-slate-900 py-6 mt-auto bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-600 text-xs">
          <p>이 도구는 HyperGryph, Yostar, 또는 MAA 팀과 공식적인 관련이 없습니다.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
