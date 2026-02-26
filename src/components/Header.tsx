import React from 'react';
import { ApiProvider } from '../types';

interface HeaderProps {
  api: ApiProvider;
  setApi: (api: ApiProvider) => void;
}

export function Header({ api, setApi }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-start z-30 pointer-events-auto">
      <div className="font-serif italic text-xl tracking-tight">Mock<span className="font-sans not-italic font-medium">.ai</span></div>
      <div className="flex gap-2">
        {(['gemini', 'doubao'] as ApiProvider[]).map((a) => (
          <button
            key={a}
            onClick={() => setApi(a)}
            className={`text-[10px] font-mono uppercase tracking-widest border rounded-full px-4 py-2 transition-all duration-500 ${api === a ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F4F0]' : 'border-transparent text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
          >
            {a} API
          </button>
        ))}
      </div>
    </header>
  );
}
