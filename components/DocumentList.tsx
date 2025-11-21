import React, { useState } from 'react';
import { Trash2, Scale, CheckCircle2, Circle, Search, CheckSquare, Square, FileText, Eye, Sparkles } from 'lucide-react';
import { UploadedFile } from '../types';

interface DocumentListProps {
  files: UploadedFile[];
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleAll?: (ids: string[], active: boolean) => void;
  type: 'law' | 'case';
  isRagMode?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({ files, onDelete, onToggle, onToggleAll, type, isRagMode }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const isCaseList = type === 'case';

  if (files.length === 0) {
    return (
      <div className={`text-center py-6 px-4 rounded-xl border border-dashed ${isCaseList ? 'bg-indigo-900/20 border-indigo-800/50' : 'bg-slate-900/30 border-slate-800'}`}>
        {isCaseList ? (
             <FileText className="w-8 h-8 mx-auto mb-2 text-indigo-400 opacity-50" />
        ) : (
             <Scale className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
        )}
        <p className="text-xs font-medium text-slate-400">
            {isCaseList ? "S'ka dokument për konsultim" : "S'ka ligje të ngarkuara"}
        </p>
      </div>
    );
  }

  // Filter files based on search
  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (active: boolean) => {
    if (onToggleAll) {
        const ids = filteredFiles.map(f => f.id);
        onToggleAll(ids, active);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Bulk Actions */}
      {!isCaseList && (
        <div className="sticky top-0 bg-[#0f172a] z-10 pb-4 space-y-3">
            <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Kërko ligjin..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-600 placeholder-slate-600"
            />
            </div>

            {/* Bulk Action Buttons - Only show if NOT in RAG mode */}
            {!isRagMode && filteredFiles.length > 0 && onToggleAll && (
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                <span>{filteredFiles.length} Ligje</span>
                <div className="flex gap-2">
                <button 
                    onClick={() => handleSelectAll(true)}
                    className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    title="Aktivizo të gjitha"
                >
                    <CheckSquare className="w-3 h-3" />
                    Të Gjitha
                </button>
                <span className="text-slate-700">|</span>
                <button 
                    onClick={() => handleSelectAll(false)}
                    className="hover:text-red-400 flex items-center gap-1 transition-colors"
                    title="Çaktivizo të gjitha"
                >
                    <Square className="w-3 h-3" />
                    Asnjë
                </button>
                </div>
            </div>
            )}
            
            {/* RAG Mode Active Banner */}
            {isRagMode && (
                 <div className="flex items-center justify-between bg-amber-500/10 text-amber-500 px-3 py-2 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-Analiza Aktive</span>
                    </div>
                    <span className="text-[10px] opacity-70">AI Zgjedh vetë</span>
                 </div>
            )}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-xs italic">
            Nuk u gjet asnjë dokument.
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div 
              key={file.id} 
              className={`
                group flex items-center justify-between p-3 rounded-lg border transition-all duration-200
                ${file.isRagAutoSelected
                    ? 'bg-amber-500/20 border-amber-500/50' // Highlight RAG selected files
                    : file.isActive && !isRagMode
                        ? (isCaseList ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-emerald-950/30 border-emerald-900/50')
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                }
              `}
            >
              <div 
                className={`flex items-center gap-3 flex-1 min-w-0 ${!isRagMode ? 'cursor-pointer' : 'cursor-default'}`} 
                onClick={() => !isRagMode && onToggle(file.id)}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                    {isRagMode && !isCaseList ? (
                        file.isRagAutoSelected ? (
                            <Eye className="w-5 h-5 text-amber-500 animate-pulse" /> 
                        ) : (
                            <Circle className="w-5 h-5 text-slate-700" />
                        )
                    ) : (
                        // Standard Manual Toggle Mode
                        <button className={`transition-colors ${file.isActive ? (isCaseList ? 'text-indigo-400' : 'text-emerald-500') : 'text-slate-600 group-hover:text-slate-400'}`}>
                            {file.isActive ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${file.isRagAutoSelected ? 'text-amber-200' : file.isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                className="ml-2 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Fshi përgjithmonë"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentList;