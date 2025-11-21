import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle, FileText } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploaderProps {
  onUpload: (files: UploadedFile[]) => void;
  category: 'law' | 'case';
  isCompact?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, category, isCompact }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCase = category === 'case';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    const newFiles: UploadedFile[] = [];
    let errorMsg = '';

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate
        if (file.type !== 'application/pdf') {
          errorMsg = `Skedari ${file.name} nuk është PDF.`;
          continue;
        }

        if (file.size > 20 * 1024 * 1024) { // 20MB limit
          errorMsg = `Skedari ${file.name} është shumë i madh (>20MB).`;
          continue;
        }

        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          newFiles.push({
            id: Math.random().toString(36).substring(2, 11) + Date.now().toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64,
            timestamp: Date.now(),
            isActive: true, // Always active by default when just uploaded
            category: category
          });
        } catch (err) {
          console.error(`Failed to read file ${file.name}`, err);
        }
      }

      if (newFiles.length > 0) {
        // For laws (bulk), we might want them inactive by default if there are many, 
        // but for Case files, they should definitely be active.
        // Let's keep the previous logic for laws: if >1 law uploaded at once, inactive.
        if (category === 'law' && newFiles.length > 1) {
            newFiles.forEach(f => f.isActive = false);
        }
        
        onUpload(newFiles);
      } else {
        setError(errorMsg || 'Asnjë skedar nuk u ngarkua.');
      }

    } catch (err) {
      console.error("Bulk upload error", err);
      setError('Dështoi ngarkimi i dokumenteve.');
    } finally {
      setIsProcessing(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept=".pdf"
        multiple={category === 'law'} // Allow multiple only for laws usually, but technically works for both
        className="hidden"
      />
      
      <div className="flex flex-col gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className={`
            flex items-center justify-center gap-2 
            border-2 border-dashed 
            transition-all duration-200 rounded-xl font-medium
            ${isCompact ? 'p-3' : 'p-6 w-full'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            ${isCase 
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400' 
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400'
            }
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isCase ? (
            <FileText className="w-5 h-5" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span className={isCompact ? 'hidden md:inline text-sm' : 'text-base'}>
            {isProcessing ? 'Duke procesuar...' : isCase ? 'Ngarko Dosjen (Për Konsultim)' : 'Ngarko Ligje (Bulk)'}
          </span>
        </button>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;