import React from 'react';
import { Settings } from 'lucide-react';
import { ApiProvider } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-start z-30 pointer-events-auto">
      <div className="font-serif italic text-xl tracking-tight">Mock<span className="font-sans not-italic font-medium">.ai</span></div>
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-full hover:bg-[#1A1A1A]/5 transition-colors"
        title="API Settings"
      >
        <Settings className="w-5 h-5 opacity-60" />
      </button>
    </header>
  );
}
