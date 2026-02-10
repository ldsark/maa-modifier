
import React, { useState, useEffect } from 'react';
import { X, Key, Save, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';
import { initializeGameData } from '../utils/gameData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('maa_gemini_api_key') || '';
      setApiKey(storedKey);
      setIsSaved(false);
      setUpdateMsg('');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('maa_gemini_api_key', apiKey.trim());
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
    }, 2000);
  };

  const handleUpdateData = async () => {
    setIsUpdating(true);
    setUpdateMsg('데이터 다운로드 중...');
    try {
        await initializeGameData(true);
        setUpdateMsg('업데이트 완료!');
    } catch (e) {
        setUpdateMsg('업데이트 실패');
    }
    setIsUpdating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            설정 (Settings)
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 block">Gemini API Key</label>
            <div className="relative">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AI Studio에서 발급받은 키를 입력하세요"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
                />
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 flex items-start gap-3 border border-slate-800 mt-2">
                <div className="p-1.5 bg-cyan-500/10 rounded-md mt-0.5">
                   <ExternalLink className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                   <h4 className="text-xs font-bold text-slate-300 mb-1">API 키 무료 발급받기</h4>
                   <a 
                     href="https://aistudio.google.com/app/apikey" 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-xs text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 underline-offset-4"
                   >
                     Google AI Studio 바로가기
                   </a>
                </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg
              ${isSaved 
                ? 'bg-green-500 text-white shadow-green-900/20 scale-95' 
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20'}`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                저장되었습니다
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                API 키 저장
              </>
            )}
          </button>

          <hr className="border-slate-800" />

          {/* Data Management Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-300">데이터 관리</h4>
            
            <button 
                onClick={handleUpdateData}
                disabled={isUpdating}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-bold text-slate-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? '업데이트 중...' : '오퍼레이터 데이터 강제 업데이트'}
            </button>

            {updateMsg && (
                <p className="text-xs text-center text-cyan-400 font-bold animate-pulse">
                    {updateMsg}
                </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
