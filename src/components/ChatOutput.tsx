import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../types';

export function ChatOutput({ messages, outputMode }: { messages: Message[], outputMode: 'voice' | 'text' }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (outputMode !== 'text') return null;

  return (
    <div className="absolute right-0 top-0 w-full md:w-1/2 h-full pt-32 pb-12 px-6 md:px-12 flex flex-col justify-end z-20 pointer-events-none">
      <div 
        ref={scrollRef}
        className="w-full max-w-lg ml-auto flex flex-col gap-4 overflow-y-auto max-h-full pr-4 pointer-events-auto custom-scrollbar mask-image-fade-top"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
              className="text-center text-xs font-mono text-[#1A1A1A]/40 my-auto"
            >
              Start the interview to see the transcript here.
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
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
