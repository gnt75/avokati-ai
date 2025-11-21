import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Download } from 'lucide-react';
import { ChatMessage, MessageRole } from '../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([message.text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `AvokatiAI_Dokument_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fadeIn`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}
        `}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Message Content */}
        <div className={`
          relative group p-4 rounded-2xl
          ${isUser 
            ? 'bg-indigo-600 text-white rounded-tr-sm' 
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}
        `}>
          {/* Text rendering */}
          <div className={`prose prose-sm max-w-none break-words ${isUser ? 'prose-invert' : ''}`}>
             <ReactMarkdown
              components={{
                // Style basic elements to look good in the chat
                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                a: ({node, ...props}) => <a className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
                code: ({node, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '')
                    return !className && String(children).indexOf('\n') === -1 ? (
                        <code className={`${isUser ? 'bg-indigo-700' : 'bg-slate-100'} px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                            {children}
                        </code>
                    ) : (
                        <code className="block bg-slate-900 text-slate-100 p-2 rounded-lg text-xs overflow-x-auto my-2" {...props}>
                            {children}
                        </code>
                    )
                }
              }}
             >
               {message.text}
             </ReactMarkdown>
             {message.isStreaming && (
               <span className="inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse"></span>
             )}
          </div>

          {/* Actions (Model only) */}
          {!isUser && !message.isStreaming && (
            <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-white/50 hover:bg-white px-2 py-1 rounded-md transition-all border border-transparent hover:border-slate-200"
                title="Kopjo tekstin"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Kopjuar' : 'Kopjo'}
              </button>
              
              <button 
                onClick={handleDownload}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 bg-white/50 hover:bg-white px-2 py-1 rounded-md transition-all border border-transparent hover:border-slate-200"
                title="Shkarko si dokument"
              >
                <Download className="w-3 h-3" />
                Shkarko
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;