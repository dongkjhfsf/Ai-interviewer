import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function Visualizer({ isListening, volume = 0 }: { isListening: boolean, volume?: number }) {
  // Amplify volume for visual effect
  const amplifiedVolume = Math.min(volume * 5, 1); 
  
  return (
    <div className="absolute top-1/2 right-[-10%] md:right-[5%] -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] pointer-events-none z-0">
      {/* Base Blob */}
      <motion.div
        animate={{
          borderRadius: [
            "40% 60% 70% 30% / 40% 50% 60% 50%",
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "30% 70% 70% 30% / 30% 30% 70% 70%",
            "40% 60% 70% 30% / 40% 50% 60% 50%"
          ],
          rotate: [0, 360],
          scale: isListening ? 1.05 + amplifiedVolume * 0.2 : 1,
        }}
        transition={{
          borderRadius: { duration: 12, repeat: Infinity, ease: "linear" },
          rotate: { duration: 24, repeat: Infinity, ease: "linear" },
          scale: { duration: 0.1, ease: "easeOut" } // Fast response to volume
        }}
        className={`absolute inset-0 transition-colors duration-1000 ${isListening ? 'bg-gradient-to-tr from-red-500/15 to-orange-500/25' : 'bg-gradient-to-tr from-[#1A1A1A]/5 to-[#1A1A1A]/10'} backdrop-blur-3xl border border-white/40`}
        style={{
          boxShadow: isListening ? `inset 0 0 ${100 + amplifiedVolume * 50}px rgba(239,68,68,${0.1 + amplifiedVolume * 0.2})` : "inset 0 0 100px rgba(255,255,255,0.5)"
        }}
      />
      
      {/* Inner Core */}
      <motion.div
        animate={{
          borderRadius: [
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "30% 70% 70% 30% / 30% 30% 70% 70%",
            "40% 60% 70% 30% / 40% 50% 60% 50%",
            "60% 40% 30% 70% / 60% 30% 70% 40%"
          ],
          rotate: [360, 0],
          scale: isListening ? 0.9 + amplifiedVolume * 0.3 : 0.8,
        }}
        transition={{
          borderRadius: { duration: 10, repeat: Infinity, ease: "linear" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 0.1, ease: "easeOut" }
        }}
        className={`absolute inset-[15%] transition-colors duration-1000 ${isListening ? 'bg-gradient-to-bl from-red-400/25 to-transparent' : 'bg-gradient-to-bl from-white/40 to-transparent'} backdrop-blur-md border border-white/30`}
      />
      
      {/* Voice Activity Rings */}
      <AnimatePresence>
        {isListening && volume > 0.01 && (
          <>
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.5, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.5 + amplifiedVolume }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-[30%] border border-red-500/40 rounded-full"
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
