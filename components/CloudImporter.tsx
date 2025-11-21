import React, { useState, useEffect } from 'react';
import { Cloud, Download, X, FileText, Loader2, AlertCircle, Database, WifiOff } from 'lucide-react';
import { UploadedFile } from '../types';

interface CloudImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (files: UploadedFile[]) => void;
}

interface CloudFile {
  name: string;
  size: number;
  updated: string;
}

// MOCK DATA FOR PREVIEW MODE
const MOCK_FILES: CloudFile[] = [
  { name: 'Kodi_Civil_2024.pdf', size: 2500000, updated: new Date().toISOString() },
  { name: 'Kodi_Penal_I_Perditesuar.pdf', size: 1800000, updated: new Date(Date.now() - 86400000).toISOString() },
  { name: 'Ligji_per_Tregtine.pdf', size: 950000, updated: new Date(Date.now() - 172800000).toISOString() },
  { name: 'Vendime_Gjykata_Larte_Vol1.pdf', size: 5200000, updated: new Date(Date.now() - 400000000).toISOString() },
  { name: 'Kontrata_Tip_Shitblerje.pdf', size: 120000, updated: new Date().toISOString() },
];

const CloudImporter: React.FC<CloudImporterProps> = ({ isOpen, onClose, onImport }) => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Load list when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFileList();
    }
  }, [isOpen]);

  const fetchFileList = async () => {
    setIsLoadingList(true);
    setError(null);
    setIsDemoMode(false);
    
    try {
      const res = await fetch('/api/gcs?action=list');
      
      // Handle non-JSON responses (common in preview/404)
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error('API not available');
      }

      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.log("Backend not detected, switching to Demo Mode for preview.");
      // Fallback to Mock Data for Preview
      setIsDemoMode(true);
      setFiles(MOCK_FILES);
    } finally {
      setIsLoadingList(false);
    }
  };

  const toggleSelection = (fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(f => f !== fileName) 
        : [...prev, fileName]
    );
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    setIsDownloading(true);
    
    const importedFiles: UploadedFile[] = [];

    try {
      // Simulate network delay for demo
      await new Promise(resolve => setTimeout(resolve, 1500));

      for (const fileName of selectedFiles) {
        // In Demo mode, we generate fake content since we can't download real files
        const fakeContent = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCisgICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqCiAgPDwgL0xlbmd0aCA0NCA+PgpzdHJlYW0KQlQKNzAgNTAgVGQKL0YxIDEyIFRmCihIZWxsbywgd29ybGQhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAwwMDAwMDAwMTU3IDAwMDAwIG4gCjAwMDAwMDAyNTUgMDAwMDAgbiAKMDAwMDAwMDM2MiAwMDAwMCBuIAp0cmFpbGVyCjw8CiAgL1NpemUgNgogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MTMKJSVFT0YK";

        importedFiles.push({
          id: Math.random().toString(36).substring(2, 11) + Date.now().toString(),
          name: fileName.split('/').pop() || fileName,
          type: 'application/pdf',
          size: 1024 * 50, // Fake size
          content: fakeContent, 
          timestamp: Date.now(),
          isActive: false,
          category: 'law'
        });
      }

      onImport(importedFiles);
      onClose();
      setSelectedFiles([]);
      
    } catch (err) {
      setError('Ndodhi një gabim gjatë importimit.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-indigo-700">
            <div className="p-2 bg-indigo-100 rounded-lg">
               <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Google Cloud Storage</h2>
              <p className="text-xs text-slate-500">
                {isDemoMode ? 'Modaliteti Demo (Preview)' : 'Importo dokumente nga arkiva e zyrës'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm">Duke u lidhur me Cloud...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-2 p-4 text-center">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : (
            <>
              {isDemoMode && (
                <div className="mx-2 mt-2 mb-1 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs flex items-center gap-2">
                  <WifiOff className="w-4 h-4" />
                  <span>Po shikoni të dhëna demo sepse API nuk është i lidhur në këtë preview.</span>
                </div>
              )}
              
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                  <Cloud className="w-12 h-12 opacity-20" />
                  <span className="text-sm">Nuk u gjetën skedarë PDF.</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => (
                    <div 
                      key={file.name}
                      onClick={() => toggleSelection(file.name)}
                      className={`
                        flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all
                        ${selectedFiles.includes(file.name) 
                            ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`
                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                            ${selectedFiles.includes(file.name) ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}
                        `}>
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${selectedFiles.includes(file.name) ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {file.name}
                            </p>
                            <p className="text-xs text-slate-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.updated).toLocaleDateString()}
                            </p>
                        </div>
                      </div>
                      
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-colors
                        ${selectedFiles.includes(file.name) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}
                      `}>
                        {selectedFiles.includes(file.name) && <Cloud className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
          <div className="text-xs text-slate-500">
            {selectedFiles.length} skedarë të zgjedhur
          </div>
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
                Anullo
            </button>
            <button 
                onClick={handleImport}
                disabled={selectedFiles.length === 0 || isDownloading}
                className={`
                    flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg text-white transition-all
                    ${selectedFiles.length === 0 || isDownloading
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'}
                `}
            >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isDownloading ? 'Duke importuar...' : isDemoMode ? 'Importo (Demo)' : 'Importo në Aplikacion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudImporter;