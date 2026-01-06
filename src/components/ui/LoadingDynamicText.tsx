"use client";

/**
 * @author: Adapted from @dorian_baffier
 * @description: Loading Dynamic Text
 * @version: 1.0.0
 * @date: 2025-09-09
 * @license: MIT
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TechnicianTranslation {
    text: string;
    language: string;
}

const technicianTranslations: TechnicianTranslation[] = [
    { text: "Technician", language: "English" },
    { text: "技術者", language: "Japanese" },
    { text: "Técnico", language: "Spanish" },
    { text: "तकनीशियन", language: "Hindi" },
    { text: "Tecnico", language: "Italian" },
    { text: "Техник", language: "Russian" },
    { text: "Technician", language: "English" },
];

interface LoadingDynamicTextProps {
    onComplete?: () => void;
    textColor?: string;
    className?: string;
}

const LoadingDynamicText: React.FC<LoadingDynamicTextProps> = ({ 
    onComplete, 
    textColor = '#6b9080',
    className = "text-6xl md:text-7xl lg:text-9xl font-bold text-center"
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        if (!isAnimating) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const nextIndex = prevIndex + 1;

                if (nextIndex >= technicianTranslations.length) {
                    clearInterval(interval);
                    setIsAnimating(false);
                    onComplete?.();
                    return prevIndex;
                }

                return nextIndex;
            });
        }, 300);

        return () => clearInterval(interval);
    }, [isAnimating, onComplete]);

    // Animation variants for the text
    const textVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { y: -100, opacity: 0 },
    };

    return (
        <section
            className="flex min-h-[200px] items-center justify-center gap-1"
            aria-label="Technician in different languages"
        >
            <div className="relative flex items-center justify-center overflow-visible">
                {isAnimating ? (
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={currentIndex}
                            className={`absolute flex items-center justify-center ${className}`}
                            style={{ 
                                color: textColor,
                                writingMode: 'horizontal-tb',
                                textOrientation: 'mixed'
                            }}
                            aria-live="off"
                            initial={textVariants.hidden}
                            animate={textVariants.visible}
                            exit={textVariants.exit}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            <span 
                                className="inline-block"
                                style={{ 
                                    writingMode: 'horizontal-tb', 
                                    display: 'inline-block',
                                    textOrientation: 'mixed',
                                    fontFeatureSettings: '"vert" 0, "vrt2" 0',
                                    textCombineUpright: 'none',
                                    direction: 'ltr',
                                    unicodeBidi: 'normal',
                                    whiteSpace: 'nowrap',
                                    transform: 'rotate(0deg)'
                                }}
                            >
                                {technicianTranslations[currentIndex].text}
                            </span>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div 
                        className={`flex items-center justify-center ${className}`} 
                        style={{ 
                            color: textColor,
                            writingMode: 'horizontal-tb',
                            textOrientation: 'mixed'
                        }}
                    >
                        <span 
                            className="inline-block"
                            style={{ 
                                writingMode: 'horizontal-tb', 
                                display: 'inline-block',
                                textOrientation: 'mixed',
                                fontFeatureSettings: '"vert" 0, "vrt2" 0',
                                textCombineUpright: 'none',
                                direction: 'ltr',
                                unicodeBidi: 'normal',
                                whiteSpace: 'nowrap',
                                transform: 'rotate(0deg)'
                            }}
                        >
                            {technicianTranslations[currentIndex].text}
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
};

export default LoadingDynamicText;
