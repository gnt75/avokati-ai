import React, { useState, useEffect } from 'react';
import { Cloud, Download, X, FileText, Loader2, AlertCircle, HardDrive, LogIn } from 'lucide-react';
import { UploadedFile } from '../types';

interface CloudImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (files: UploadedFile[]) => void;
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

const CloudImporter: React.FC<CloudImporterProps> = ({ isOpen, onClose, onImport }) => {
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load Google API scripts
  useEffect(() => {
    if (isOpen && !isApiLoaded) {
      const loadGapi = () => {
        // Cast window to any to avoid TypeScript errors
        const w = window as any;
        if (w.gapi && w.google) {
          setIsApiLoaded(true);
          initializeGooglePicker();
        } else {
          setTimeout(loadGapi, 500);
        }
      };
      loadGapi();
    }
  }, [isOpen]);

  const initializeGooglePicker = () => {
    const apiKey = process.env.VITE_GOOGLE_API_KEY;
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;

    if (!apiKey || !clientId) {
      setError("Konfigurimi i Google mungon (API Key/Client ID).");
      return;
    }

    // Initialize Identity Services (for OAuth)
    const w = window as any;
    const client = w.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: '', // defined later
    });
    setTokenClient(client);
  };

  const handleOpenPicker = () => {
    if (!tokenClient) return;
    
    setIsProcessing(true);
    setError(null);

    // 1. Request Access Token
    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        setError("Përdoruesi refuzoi aksesin ose ndodhi një gabim.");
        setIsProcessing(false);
        return;
      }
      
      // 2. Build and Show Picker
      createPicker(response.access_token);
    };

    // Trigger login flow
    tokenClient.requestAccessToken({ prompt: '' });
  };

  const createPicker = (accessToken: string) => {
    const w = window as any;
    if (!w.google || !w.google.picker) {
        // Load picker library if not ready
        w.gapi.load('picker', { callback: () => showPicker(accessToken) });
    } else {
        showPicker(accessToken);
    }
  };

  const showPicker = (accessToken: string) => {
      const apiKey = process.env.VITE_GOOGLE_API_KEY;
      const w = window as any;
      
      const picker = new w.google.picker.PickerBuilder()
        .addView(w.google.picker.ViewId.PDFS) // Show PDFs
        .addView(w.google.picker.ViewId.DOCS) // And Docs
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey!)
        .setCallback((data: any) => pickerCallback(data, accessToken))
        .build();
      
      picker.setVisible(true);
      setIsProcessing(false); // Picker is open, processing UI done
  };

  const pickerCallback = async (data: any, accessToken: string) => {
    const w = window as any;
    if (data[w.google.picker.Response.ACTION] === w.google.picker.Action.PICKED) {
        setIsProcessing(true);
        const docs = data[w.google.picker.Response.DOCUMENTS];
        const importedFiles: UploadedFile[] = [];

        try {
            for (const doc of docs) {
                const fileId = doc[w.google.picker.Document.ID];
                const name = doc[w.google.picker.Document.NAME];
                
                // Download file content using the token
                const content = await downloadFile(fileId, accessToken);
                
                if (content) {
                    importedFiles.push({
                        id: Math.random().toString(36).substring(2, 11) + Date.now().toString(),
                        name: name,
                        type: 'application/pdf',
                        size: 1024 * 100, // Approximate
                        content: content,
                        timestamp: Date.now(),
                        isActive: false,
                        category: 'law'
                    });
                }
            }
            
            onImport(importedFiles);
            onClose();
        } catch (e) {
            console.error(e);
            setError("Dështoi shkarkimi i skedarëve.");
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const downloadFile = async (fileId: string, accessToken: string): Promise<string | null> => {
    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) throw new Error("Download failed");
        
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Download error", e);
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3 text-indigo-800">
            <div className="p-2 bg-indigo-100 rounded-lg">
               <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Google Drive</h2>
              <p className="text-xs text-slate-500">Lidhuni me llogarinë tuaj</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center justify-center gap-6 text-center">
            {error ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            ) : (
                <>
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-2">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Importo nga Drive Personal</h3>
                        <p className="text-sm text-slate-500 mt-1 px-4">
                            Zgjidhni dokumentet PDF nga Google Drive juaj për t'i analizuar me Avokati AI.
                        </p>
                    </div>
                </>
            )}

            <button
                onClick={handleOpenPicker}
                disabled={isProcessing || !isApiLoaded}
                className={`
                    w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium transition-all shadow-sm
                    ${isProcessing || !isApiLoaded
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-indigo-200 hover:shadow-md transform hover:-translate-y-0.5'}
                `}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Duke u lidhur...</span>
                    </>
                ) : (
                    <>
                        <LogIn className="w-5 h-5" />
                        <span>Lidh Google Drive</span>
                    </>
                )}
            </button>

            <p className="text-[10px] text-slate-400">
                Ne nuk ruajmë fjalëkalimin tuaj. Qasja bëhet vetëm për skedarët që ju zgjidhni.
            </p>
        </div>
      </div>
    </div>
  );
};
