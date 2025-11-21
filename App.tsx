import React, { useState, useEffect, useRef } from 'react';
import { 
  Files, 
  Send, 
  Menu, 
  X, 
  Scale,
  Briefcase,
  ScrollText,
  Gavel,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Save,
  FolderOpen,
  Cpu,
  Sparkles,
  BrainCircuit,
  Cloud
} from 'lucide-react';
import FileUploader from './components/FileUploader';
import DocumentList from './components/DocumentList';
import ChatMessageBubble from './components/ChatMessageBubble';
import CloudImporter from './components/CloudImporter'; // New Import
import { UploadedFile, ChatMessage, MessageRole } from './types';
import { streamResponse, identifyRelevantFiles } from './services/geminiService';
import { saveFileToDB, getAllFilesFromDB, deleteFileFromDB, updateFileInDB } from './services/dbService';

const App: React.FC = () => {
  // State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: MessageRole.MODEL,
      text: "**Avokati AI:** Përshëndetje! Unë mund të menaxhoj qindra ligje.\n\nKëshillë: Përdorni opsionin **'Auto-Analizë'** (RAG) që unë të gjej vetë ligjet e duhura në databazë për çdo pyetje tuajën, pa i aktivizuar të gjitha manualisht.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null); // 'searching', 'analyzing'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isRagMode, setIsRagMode] = useState(true); // Default to RAG for large datasets
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false); // State for cloud modal
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_ACTIVE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  // Load files from DB on startup
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const dbFiles = await getAllFilesFromDB();
        dbFiles.sort((a, b) => b.timestamp - a.timestamp);
        setFiles(dbFiles);
      } catch (err) {
        console.error("Failed to load files from DB", err);
        setErrorMessage("Nuk arritëm të ngarkojmë dokumentet e ruajtura.");
      } finally {
        setIsDbLoading(false);
      }
    };
    loadFiles();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingStep]);

  const handleUpload = async (newFiles: UploadedFile[]) => {
    setFiles(prev => [...newFiles, ...prev]);
    setErrorMessage(null);
    try {
      await Promise.all(newFiles.map(f => saveFileToDB(f)));
    } catch (err) {
      console.error("Failed to save files to DB", err);
    }
  };

  const handleDelete = async (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    try {
      await deleteFileFromDB(id);
    } catch (err) {
      console.error("Failed to delete from DB", err);
    }
  };

  const handleToggleFile = async (id: string) => {
    const targetFile = files.find(f => f.id === id);
    if (!targetFile) return;

    const updatedFile = { ...targetFile, isActive: !targetFile.isActive };
    setFiles(prev => prev.map(f => f.id === id ? updatedFile : f));
    
    try {
      await updateFileInDB(updatedFile);
    } catch (err) {
      console.error("Failed to update status in DB", err);
    }
  };

  const handleToggleAll = async (ids: string[], active: boolean) => {
    setFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, isActive: active } : f));
    const filesToUpdate = files
      .filter(f => ids.includes(f.id) && f.isActive !== active)
      .map(f => ({ ...f, isActive: active }));
    if (filesToUpdate.length > 0) {
      try {
        await Promise.all(filesToUpdate.map(f => updateFileInDB(f)));
      } catch (err) {
        console.error("Failed to bulk update DB", err);
      }
    }
  };

  // Calculate Context for Manual Mode
  const manualActiveFiles = files.filter(f => f.isActive);
  const currentUsageBytes = manualActiveFiles.reduce((acc, file) => acc + file.size, 0);
  const usagePercentage = Math.min((currentUsageBytes / MAX_ACTIVE_SIZE_BYTES) * 100, 100);
  const isOverLimit = usagePercentage > 90;

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    setErrorMessage(null);

    // Reset RAG indicators
    setFiles(prev => prev.map(f => ({ ...f, isRagAutoSelected: false })));

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // --- RAG LOGIC vs MANUAL LOGIC ---
    let filesToProcess: UploadedFile[] = [];
    const caseFiles = files.filter(f => f.category === 'case' && f.isActive); // Case files always active if checked

    if (isRagMode) {
        setLoadingStep("🔎 Duke kërkuar në bibliotekë...");
        
        try {
            // Step 1: The Router
            const relevantLawIds = await identifyRelevantFiles(files, userMsg.text, caseFiles);
            
            // Step 2: Mark them visually
            setFiles(prev => prev.map(f => 
                relevantLawIds.includes(f.id) ? { ...f, isRagAutoSelected: true } : f
            ));

            // Step 3: Prepare payload
            const relevantLaws = files.filter(f => relevantLawIds.includes(f.id));
            filesToProcess = [...caseFiles, ...relevantLaws]; // Always include case + found laws

            setLoadingStep(`📚 U gjetën ${relevantLaws.length} ligje relevante. Duke analizuar...`);
        } catch (e) {
            console.error("RAG Router Error", e);
            // Fallback to manual active files if router fails
            filesToProcess = manualActiveFiles;
        }

    } else {
        // Manual Mode
        filesToProcess = manualActiveFiles;
    }

    // Prepare placeholder
    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: modelMsgId,
      role: MessageRole.MODEL,
      text: '',
      isStreaming: true,
      timestamp: Date.now()
    }]);

    try {
      let currentResponseText = '';
      
      await streamResponse(
        filesToProcess,
        messages, 
        userMsg.text,
        (chunk) => {
          currentResponseText += chunk;
          setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
              ? { ...msg, text: currentResponseText }
              : msg
          ));
        }
      );

      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { ...msg, isStreaming: false }
          : msg
      ));

    } catch (error: any) {
      console.error("Failed to get response", error);
      let friendlyError = "Më falni, ndesha një gabim teknik.";
      if (error.message && (error.message.includes("token") || error.message.includes("limit"))) {
          friendlyError = error.message;
          setErrorMessage("Kujdes: Tepër informacion. Provoni RAG.");
      }
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { ...msg, text: `⚠️ **Gabim**: ${friendlyError}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeCaseFiles = files.filter(f => f.category === 'case' && f.isActive);
  const activeLawFiles = files.filter(f => f.category === 'law' || !f.category);

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      <CloudImporter 
        isOpen={isCloudModalOpen} 
        onClose={() => setIsCloudModalOpen(false)} 
        onImport={handleUpload} 
      />

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-slate-950 text-slate-200 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col shadow-2xl h-full
      `}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3 text-amber-500">
            <Scale className="w-7 h-7" />
            <div>
              <h1 className="text-lg font-bold tracking-tight font-serif leading-none">Avokati AI</h1>
              <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">Asistent Ligjor</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Switcher (RAG vs Manual) */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-800">
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" />
                    Metoda e Punës
                </span>
             </div>
             <button 
                onClick={() => setIsRagMode(!isRagMode)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isRagMode 
                    ? 'bg-amber-950/30 border-amber-700/50 text-amber-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
             >
                <div className="flex items-center gap-2">
                    {isRagMode ? <Sparkles className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                    <div className="text-left">
                        <div className="text-xs font-bold">{isRagMode ? 'Auto-Analizë (RAG)' : 'Zgjedhje Manuale'}</div>
                        <div className="text-[9px] opacity-80">{isRagMode ? 'AI gjen ligjet automatikisht' : 'Ti zgjedh çfarë të lexohet'}</div>
                    </div>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isRagMode ? 'bg-amber-600' : 'bg-slate-600'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${isRagMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
             </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col min-h-0">
          
          {/* CASE FILES */}
          <div className="p-6 pb-2 flex-shrink-0 border-b border-slate-900 bg-slate-900/20">
            <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Dosja e Çështjes
            </h2>
            <FileUploader onUpload={handleUpload} category="case" isCompact={true} />
            <div className="mt-3">
                <DocumentList 
                    files={activeCaseFiles}
                    onDelete={handleDelete}
                    onToggle={handleToggleFile}
                    type="case"
                />
            </div>
          </div>

          {/* LAW FILES */}
          <div className="p-6 flex-1 flex flex-col min-h-0">
            <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-amber-500" />
                        Baza Ligjore
                    </h2>
                    <button 
                        onClick={() => setIsCloudModalOpen(true)}
                        className="text-[10px] flex items-center gap-1 text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-1 rounded border border-indigo-900/50 transition-colors"
                    >
                        <Cloud className="w-3 h-3" />
                        GCS
                    </button>
                </div>
                <FileUploader onUpload={handleUpload} category="law" isCompact={true} />
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                 <DocumentList 
                    files={activeLawFiles} 
                    onDelete={handleDelete} 
                    onToggle={handleToggleFile}
                    onToggleAll={handleToggleAll}
                    type="law"
                    isRagMode={isRagMode}
                 />
            </div>
          </div>

          {/* Footer Links */}
          <div className="p-6 pt-2 border-t border-slate-800/50 flex-shrink-0">
             <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Burime Zyrtare
              </h2>
            <a 
              href="https://qbz.gov.al/publications/codes" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 transition-all"
            >
              <span className="text-sm text-slate-400 group-hover:text-amber-500">Kodet (QBZ)</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full w-full relative bg-[#F3F4F6]">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-bold font-serif">
            <Scale className="w-5 h-5 text-amber-500" />
            Avokati AI
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-300">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Error/Loading Banner */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
             <div className="flex items-center gap-3 text-red-700 text-sm font-medium">
               <AlertTriangle className="w-5 h-5" />
               {errorMessage}
             </div>
             <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600"><X className="w-5 h-5" /></button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col">
             {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} />
             ))}
             
             {loadingStep && (
                <div className="flex items-center gap-3 text-slate-500 text-sm animate-pulse ml-12 mb-4">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    {loadingStep}
                </div>
             )}
             
             <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200 shadow-lg z-10">
          <div className="max-w-4xl mx-auto relative">
             {/* Context Status Bar */}
             <div className="absolute -top-12 left-0 flex gap-2">
                {isRagMode ? (
                    <div className="flex items-center gap-2 bg-amber-600 text-white px-3 py-1.5 rounded-t-lg text-xs font-medium shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        Auto-Analiza: {activeLawFiles.length} ligje në dispozicion
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-slate-700 text-white px-3 py-1.5 rounded-t-lg text-xs font-medium shadow-sm">
                        <Cpu className="w-3 h-3" />
                        Manual: {manualActiveFiles.length} ligje aktive ({Math.round(usagePercentage)}%)
                    </div>
                )}
             </div>

            <div className="relative flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-300 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all p-2 shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Shkruani pyetjen ose çështjen tuaj këtu..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 resize-none max-h-40 py-3 px-2 font-medium text-base"
                rows={1}
                style={{ minHeight: '48px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={`
                  p-3 rounded-lg flex-shrink-0 mb-0.5 transition-all duration-200
                  ${!input.trim() || isLoading 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 text-amber-500 hover:bg-slate-800 hover:shadow-md hover:scale-105 active:scale-95'}
                `}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;