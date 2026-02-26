import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileArchive, FolderArchive, Play, Square, Mic, Type, X, Link as LinkIcon } from 'lucide-react';
import { InterviewMode, OutputMode, ContextSource } from '../types';

interface ControlsProps {
  mode: InterviewMode;
  setMode: (m: InterviewMode) => void;
  outputMode: OutputMode;
  setOutputMode: (m: OutputMode) => void;
  contextSource: ContextSource;
  setContextSource: (c: ContextSource) => void;
  isListening: boolean;
  setIsListening: (l: boolean) => void;
}

export function Controls({
  mode, setMode,
  outputMode, setOutputMode,
  contextSource, setContextSource,
  isListening, setIsListening
}: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setContextSource({ type: 'file', value: e.target.files[0], name: e.target.files[0].name });
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setContextSource({ type: 'folder', value: e.target.files, name: `${e.target.files.length} files selected` });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-6 max-w-md mt-10 relative z-20 pointer-events-auto"
    >
      {/* Mode & Output Toggles */}
      <div className="flex flex-col gap-4 border-b border-[#1A1A1A]/10 pb-4">
        <div className="flex gap-6">
          <button onClick={() => setMode('tech')} className={`text-sm tracking-wide transition-all duration-500 relative ${mode === 'tech' ? 'font-medium' : 'opacity-40 hover:opacity-100'}`}>
            Realistic Tech
            {mode === 'tech' && <motion.div layoutId="mode-indicator" className="absolute -bottom-[9px] left-0 w-full h-[1px] bg-[#1A1A1A]" />}
          </button>
          <button onClick={() => setMode('module')} className={`text-sm tracking-wide transition-all duration-500 relative ${mode === 'module' ? 'font-medium' : 'opacity-40 hover:opacity-100'}`}>
            Module Practice
            {mode === 'module' && <motion.div layoutId="mode-indicator" className="absolute -bottom-[9px] left-0 w-full h-[1px] bg-[#1A1A1A]" />}
          </button>
        </div>
        
        <div className="flex gap-2 mt-2">
          <button onClick={() => setOutputMode('voice')} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${outputMode === 'voice' ? 'border-[#1A1A1A] bg-[#1A1A1A]/5' : 'border-transparent opacity-50 hover:opacity-100'}`}>
            <Mic className="w-3 h-3" /> Voice Output
          </button>
          <button onClick={() => setOutputMode('text')} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${outputMode === 'text' ? 'border-[#1A1A1A] bg-[#1A1A1A]/5' : 'border-transparent opacity-50 hover:opacity-100'}`}>
            <Type className="w-3 h-3" /> Text Output
          </button>
        </div>
      </div>

      {/* Context Input Area */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono uppercase tracking-widest opacity-50">Context Source</label>
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-[#1A1A1A]/10 rounded-2xl p-1.5 focus-within:border-[#1A1A1A]/40 focus-within:bg-white transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          
          {contextSource.type === 'none' || contextSource.type === 'url' ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-[#F5F4F0] flex items-center justify-center shrink-0">
                <LinkIcon className="w-4 h-4 opacity-60" />
              </div>
              <input 
                type="text" 
                value={contextSource.type === 'url' ? (contextSource.value as string) : ''}
                onChange={(e) => setContextSource({ type: e.target.value ? 'url' : 'none', value: e.target.value })}
                placeholder="Paste GitHub URL..." 
                className="bg-transparent border-none outline-none w-full font-mono text-xs placeholder:text-[#1A1A1A]/30"
              />
            </>
          ) : (
            <div className="flex items-center gap-3 w-full pl-2">
              {contextSource.type === 'file' ? <FileArchive className="w-4 h-4 opacity-60" /> : <FolderArchive className="w-4 h-4 opacity-60" />}
              <span className="font-mono text-xs truncate flex-1">{contextSource.name}</span>
              <button onClick={() => setContextSource({ type: 'none', value: null })} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors">
                <X className="w-4 h-4 opacity-60" />
              </button>
            </div>
          )}

          {/* Upload Buttons */}
          {(contextSource.type === 'none' || contextSource.type === 'url') && (
            <div className="flex gap-1 pr-1">
              <button onClick={() => fileInputRef.current?.click()} title="Upload Zip Archive" className="w-9 h-9 rounded-xl hover:bg-[#F5F4F0] flex items-center justify-center shrink-0 transition-colors">
                <FileArchive className="w-4 h-4 opacity-60" />
              </button>
              <button onClick={() => folderInputRef.current?.click()} title="Select Local Folder" className="w-9 h-9 rounded-xl hover:bg-[#F5F4F0] flex items-center justify-center shrink-0 transition-colors">
                <FolderArchive className="w-4 h-4 opacity-60" />
              </button>
            </div>
          )}
        </div>
        
        {/* Hidden Inputs */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".zip,.rar,.tar.gz" className="hidden" />
        <input type="file" ref={folderInputRef} onChange={handleFolderChange} {...{ webkitdirectory: "", directory: "" } as any} className="hidden" />
      </div>
      
      {/* Action Button */}
      <div className="flex gap-4 items-center mt-2">
        <button 
          onClick={() => setIsListening(!isListening)}
          className={`group relative flex items-center justify-center gap-3 rounded-full py-4 px-8 text-sm font-medium transition-all duration-500 overflow-hidden ${isListening ? 'bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)]' : 'bg-[#1A1A1A] text-[#F5F4F0] hover:scale-[1.02] shadow-[0_20px_40px_rgba(0,0,0,0.15)]'}`}
        >
          <div className="relative z-10 flex items-center gap-2">
            {isListening ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isListening ? 'End Interview' : 'Start Interview'}
          </div>
          {!isListening && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out rounded-full" />}
        </button>
        
        <AnimatePresence>
          {isListening && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 text-xs font-mono text-red-500"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Recording
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
