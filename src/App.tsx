import React, { useState } from 'react';
import { Header } from './components/Header';
import { HeroTypography } from './components/HeroTypography';
import { Controls } from './components/Controls';
import { Visualizer } from './components/Visualizer';
import { ChatOutput } from './components/ChatOutput';
import { ApiProvider, InterviewMode, OutputMode, ContextSource } from './types';
import { useInterview } from './hooks/useInterview';

export default function App() {
  const [api, setApi] = useState<ApiProvider>('gemini');
  const [mode, setMode] = useState<InterviewMode>('tech');
  const [outputMode, setOutputMode] = useState<OutputMode>('voice');
  const [contextSource, setContextSource] = useState<ContextSource>({ type: 'none', value: null });

  const { isListening, connectionState, messages, error, volume, startInterview, stopInterview } = useInterview(
    api, mode, outputMode, contextSource
  );

  const handleToggleListening = (listening: boolean) => {
    if (listening) {
      startInterview();
    } else {
      stopInterview();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#1A1A1A] font-sans overflow-hidden relative selection:bg-[#1A1A1A] selection:text-[#F5F4F0]">
      {/* Background Noise for texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <Header api={api} setApi={setApi} />

      <main className="relative w-full h-screen flex flex-col justify-center px-6 md:px-20 z-10">
        <div className="flex w-full h-full items-center">
          {/* Left Column: Typography & Controls */}
          <div className="w-full md:w-1/2 z-10 flex flex-col justify-center">
            <HeroTypography />
            <Controls 
              mode={mode} setMode={setMode}
              outputMode={outputMode} setOutputMode={setOutputMode}
              contextSource={contextSource} setContextSource={setContextSource}
              isListening={isListening} setIsListening={handleToggleListening}
            />
            
            {/* Connection Status & Error */}
            <div className="mt-6 flex flex-col gap-2">
              {connectionState !== 'disconnected' && (
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-60">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    connectionState === 'connected' ? 'bg-green-500' : 
                    connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  {connectionState === 'connected' ? 'AI Connected' : 
                   connectionState === 'connecting' ? 'Connecting...' : 'Connection Error'}
                </div>
              )}
              {error && (
                <div className="text-red-500 text-xs font-mono max-w-md bg-red-50 p-2 rounded border border-red-100">
                  Error: {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Chat Output (if text mode) */}
          <ChatOutput messages={messages} outputMode={outputMode} />
        </div>

        {/* Background Visualizer */}
        <Visualizer isListening={isListening} volume={volume} />
      </main>
    </div>
  );
}
