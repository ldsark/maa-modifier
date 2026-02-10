
import React, { useCallback } from 'react';
import { Upload, FileJson } from 'lucide-react';

interface DropZoneProps {
  onFileLoaded: (name: string, content: string, description?: string, author?: string, sourceId?: string) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileLoaded }) => {
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Local files don't have separate metadata fields usually, so pass undefined
      onFileLoaded(file.name, text, undefined, undefined, undefined);
    };
    reader.readAsText(file);
  }, [onFileLoaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div 
        className="p-10 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/30 hover:bg-slate-800/50 hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input 
          type="file" 
          id="fileInput" 
          className="hidden" 
          accept=".json"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
        <div className="p-4 bg-slate-800 rounded-full group-hover:scale-110 group-hover:bg-cyan-900/20 transition-all duration-300 shadow-xl shadow-black/20">
          <Upload className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-200 mb-1">JSON 파일 업로드</h3>
          <p className="text-slate-400 text-sm">여기를 클릭하거나 파일을 드래그하세요</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono mt-2 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          <FileJson className="w-3 h-3" />
          <span>SUPPORTED: .JSON</span>
        </div>
      </div>
    </div>
  );
};
