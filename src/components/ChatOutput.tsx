import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send } from 'lucide-react';
import { Message } from '../types';

interface ChatOutputProps {
  messages: Message[];
  outputMode: 'voice' | 'text';
  onSendMessage?: (text: string) => void;
  isListening: boolean;
}

export function ChatOutput({ messages, outputMode, onSendMessage, isListening }: ChatOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  if (outputMode !== 'text') return null;

  return (
    <div className="absolute right-0 top-0 w-full md:w-1/2 h-full pt-32 pb-12 px-6 md:px-12 flex flex-col justify-end z-20 pointer-events-none">
      <div 
        ref={scrollRef}
        className="w-full max-w-lg ml-auto flex flex-col gap-4 overflow-y-auto max-h-full pr-4 pointer-events-auto custom-scrollbar mask-image-fade-top pb-20"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
              className="text-center text-xs font-mono text-[#1A1A1A]/40 my-auto"
            >
              Start the interview to begin.
            </motion.div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`p-4 rounded-2xl backdrop-blur-md border ${
                msg.role === 'user' 
                  ? 'bg-[#1A1A1A]/80 text-[#F5F4F0] self-end rounded-br-sm border-[#1A1A1A]' 
                  : 'bg-white/60 text-[#1A1A1A] self-start rounded-bl-sm border-white/40 shadow-sm'
              }`}
              style={{ maxWidth: '85%' }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      {isListening && onSendMessage && (
        <div className="w-full max-w-lg ml-auto mt-4 pointer-events-auto">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your answer..."
              className="w-full bg-white/80 backdrop-blur-md border border-[#1A1A1A]/10 rounded-full pl-6 pr-12 py-3 text-sm shadow-lg focus:outline-none focus:border-[#1A1A1A]/30 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-2 p-2 bg-[#1A1A1A] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
