import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle } from 'lucide-react';
import { ApiConfig, ApiProvider } from '../types';

interface ApiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export function ApiSettings({ isOpen, onClose, config, onSave }: ApiSettingsProps) {
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#F5F4F0] rounded-2xl shadow-2xl border border-[#1A1A1A]/10 p-6 z-50 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium tracking-tight">API Configuration</h2>
              <button onClick={onClose} className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors">
                <X className="w-5 h-5 opacity-60" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="flex gap-2 p-1 bg-[#1A1A1A]/5 rounded-lg">
                {(['gemini', 'doubao'] as ApiProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setLocalConfig({ ...localConfig, provider: p })}
                    className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest rounded-md transition-all ${
                      localConfig.provider === p 
                        ? 'bg-white shadow-sm text-[#1A1A1A]' 
                        : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Configuration Fields */}
              <div className="space-y-4">
                {localConfig.provider === 'gemini' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest opacity-50">API Key</label>
                    <input
                      type="password"
                      value={localConfig.apiKey}
                      onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                      placeholder="Leave empty to use default env key"
                      className="w-full bg-white border border-[#1A1A1A]/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A1A1A]/30 transition-colors"
                    />
                    <p className="text-[10px] opacity-40">
                      Default key is loaded from environment variables. Only set this if you want to override it.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest opacity-50">API Key <span className="text-red-500">*</span></label>
                      <input
                        type="password"
                        value={localConfig.apiKey}
                        onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full bg-white border border-[#1A1A1A]/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A1A1A]/30 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest opacity-50">Base URL</label>
                      <input
                        type="text"
                        value={localConfig.baseUrl || ''}
                        onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                        placeholder="https://ark.cn-beijing.volces.com/api/v3"
                        className="w-full bg-white border border-[#1A1A1A]/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A1A1A]/30 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest opacity-50">Model Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={localConfig.modelName || ''}
                        onChange={(e) => setLocalConfig({ ...localConfig, modelName: e.target.value })}
                        placeholder="ep-2024..."
                        className="w-full bg-white border border-[#1A1A1A]/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A1A1A]/30 transition-colors"
                      />
                    </div>
                    
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Doubao API currently supports <strong>Text Output</strong> mode only. Voice interaction is simulated or disabled.</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-[#1A1A1A] text-[#F5F4F0] px-6 py-2.5 rounded-full text-sm font-medium hover:scale-[1.02] transition-transform shadow-lg"
              >
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
