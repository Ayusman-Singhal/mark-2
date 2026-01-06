import React, { useEffect, useState } from 'react';
import { SparklesCore } from './shadcn-io/sparkles';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingDynamicText from './LoadingDynamicText';

interface LoadingScreenProps {
  isLoading: boolean;
  onLoadingComplete: () => void;
  duration?: number; // Duration in milliseconds
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading,
  onLoadingComplete,
  duration = 2500, // Default 2.5 seconds
}) => {
  const [shouldShow, setShouldShow] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShouldShow(true);
      const timer = setTimeout(() => {
        setShouldShow(false);
        onLoadingComplete();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isLoading, duration, onLoadingComplete]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ backgroundColor: '#EAF4F4' }}
        >
          {/* Dynamic Title */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ 
              duration: 0.6,
              ease: "easeOut"
            }}
            className="relative z-20 mb-8"
          >
            <LoadingDynamicText
              textColor="#6b9080"
              className="text-6xl md:text-7xl lg:text-9xl font-bold text-center"
            />
          </motion.div>

          {/* Sparkles Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full max-w-6xl h-60 relative px-4"
          >
            {/* Extended Gradient Lines */}
            <div className="absolute inset-x-8 top-0 bg-gradient-to-r from-transparent via-[#6b9080] to-transparent h-[2px] w-5/6 blur-sm" />
            <div className="absolute inset-x-8 top-0 bg-gradient-to-r from-transparent via-[#6b9080] to-transparent h-px w-5/6" />
            <div className="absolute inset-x-24 top-0 bg-gradient-to-r from-transparent via-[#CCE3DE] to-transparent h-[5px] w-2/3 blur-sm" />
            <div className="absolute inset-x-24 top-0 bg-gradient-to-r from-transparent via-[#CCE3DE] to-transparent h-px w-2/3" />
            
            {/* Enhanced Sparkles Core Component */}
            <SparklesCore
              background="transparent"
              minSize={0.6}
              maxSize={2.5}
              particleDensity={1200}
              className="w-full h-full"
              particleColor="#6b9080"
              speed={3}
            />
            
            {/* Additional Sparkles Layer for Depth */}
            <div className="absolute inset-0 w-full h-full">
              <SparklesCore
                background="transparent"
                minSize={0.3}
                maxSize={1.8}
                particleDensity={600}
                className="w-full h-full"
                particleColor="#CCE3DE"
                speed={1.5}
              />
            </div>
            
            {/* Enhanced Radial Gradient Mask */}
            <div 
              className="absolute inset-0 w-full h-full"
              style={{ 
                backgroundColor: '#EAF4F4',
                WebkitMaskImage: 'radial-gradient(500px 250px at center top, transparent 15%, white)',
                maskImage: 'radial-gradient(500px 250px at center top, transparent 15%, white)'
              }}
            />
          </motion.div>

          {/* Loading Text */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-lg font-medium opacity-80" style={{ color: '#6b9080' }}>
              Loading...
            </p>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="mt-6 w-64 h-1 bg-[#CCE3DE] rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-[#6b9080] rounded-full origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ 
                duration: duration / 1000,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
