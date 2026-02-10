
import React, { useState, useEffect } from 'react';
import { getAvatarUrl, getCharId } from '../utils/gameData';
import { findOperatorEntry } from '../data/operatorDb';

interface Props {
  name: string; 
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const OperatorAvatar: React.FC<Props> = ({ name, className = '', size = 'md' }) => {
  const [src, setSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [backupAttempt, setBackupAttempt] = useState(0); 

  // Attempt to resolve the entry to get valid names
  const entry = findOperatorEntry(name);
  const displayName = entry?.name || name;
  const operatorId = entry?.id || getCharId(name);
  
  useEffect(() => {
    setHasError(false);
    setBackupAttempt(0);
    
    let url = '';
    
    // Priority 1: ID lookup (Most reliable)
    if (operatorId) {
        url = getAvatarUrl(operatorId);
    } else {
        // Priority 2: Name lookup
        url = getAvatarUrl(name);
    }
    
    setSrc(url);
  }, [name, operatorId]);

  const handleError = () => {
      if (!operatorId) {
          setHasError(true);
          return;
      }

      // Chain of fallback Sources
      if (backupAttempt === 0) {
          // Fallback 1: Aceship via jsDelivr
          setBackupAttempt(1);
          setSrc(`https://cdn.jsdelivr.net/gh/Aceship/Arknight-Images@master/avatars/${encodeURIComponent(operatorId)}.png`);
      } else if (backupAttempt === 1) {
          // Fallback 2: Yuanyan Raw (GitHub)
          setBackupAttempt(2);
          setSrc(`https://raw.githubusercontent.com/Yuanyan3060/Arknights-Bot-Resource/main/avatar/${encodeURIComponent(operatorId)}.png`);
      } else if (backupAttempt === 2) {
           // Fallback 3: Aceship Raw (GitHub)
           setBackupAttempt(3);
           setSrc(`https://raw.githubusercontent.com/Aceship/Arknight-Images/master/avatars/${encodeURIComponent(operatorId)}.png`);
      } else {
          setHasError(true);
      }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
  };

  if (!src || hasError) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-black shadow-inner bg-slate-800 text-slate-600 border border-slate-700 ${className}`} title={displayName}>
        {displayName.substring(0, 1)}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} relative rounded-lg overflow-hidden bg-slate-800 ${className}`}>
      <img 
        src={src} 
        alt={displayName}
        className="w-full h-full object-cover transform scale-110" 
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
};
