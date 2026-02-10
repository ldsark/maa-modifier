
import React, { useEffect, useState } from 'react';
import { Github, Download, Settings, Users } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenMyOperators: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenMyOperators }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  // Using Yuanyan3060 CDN which is reliable for Arknights assets. Specific Amiya Avatar.
  const [logoSrc, setLogoSrc] = useState("https://cdn.jsdelivr.net/gh/Yuanyan3060/Arknights-Bot-Resource@main/avatar/char_002_amiya.png");

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={logoSrc}
            alt="MAA Icon"
            onError={() => {
              // If CDN fails, try raw github as last resort, but NEVER fall back to the Eagle icon.
              if (logoSrc.includes('cdn.jsdelivr.net')) {
                setLogoSrc("https://raw.githubusercontent.com/Yuanyan3060/Arknights-Bot-Resource/main/avatar/char_002_amiya.png");
              }
            }}
            className="w-9 h-9 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-slate-900 object-cover"
          />
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-100 flex items-center gap-2">
              MAA Copilot 
              <span className="hidden md:inline-block text-xs px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20 font-mono">MODIFIER</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {deferredPrompt && (
             <button 
               onClick={handleInstallClick}
               className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-full transition-colors shadow-lg shadow-cyan-900/20 animate-pulse mr-2"
             >
               <Download className="w-3 h-3" />
               앱 설치
             </button>
           )}

           <button
             onClick={onOpenMyOperators}
             className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-green-400 border border-slate-700 hover:border-green-500/50 rounded-lg transition-all text-xs font-bold shadow-sm"
             title="내 오퍼레이터 관리"
           >
             <Users className="w-4 h-4" />
             <span>내 오퍼</span>
           </button>

           <div className="w-px h-4 bg-slate-800 mx-1"></div>

           <button
             onClick={onOpenSettings}
             className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
             title="설정 (API Key)"
           >
             <Settings className="w-5 h-5" />
           </button>
           
           <a 
             href="https://github.com/MaaAssistantArknights/MaaAssistantArknights"
             target="_blank"
             rel="noreferrer"
             className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
             title="MAA Github"
           >
             <Github className="w-5 h-5" />
           </a>
        </div>
      </div>
    </header>
  );
};
