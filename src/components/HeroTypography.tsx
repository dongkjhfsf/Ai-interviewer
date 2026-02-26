import React from 'react';
import { motion } from 'motion/react';

export function HeroTypography() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none"
    >
      <h1 className="text-[12vw] md:text-[80px] font-light tracking-tighter leading-[0.85] mb-6">
        <span className="block opacity-50 text-2xl md:text-3xl mb-4 font-serif italic">Real-time</span>
        Technical <br/>
        <span className="font-serif italic">Interview.</span>
      </h1>
    </motion.div>
  );
}
