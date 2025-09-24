import React, { useEffect, useState } from 'react';
import { CircularProgress } from './CircularProgress';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  currentStepLabel: string;
  nextStepLabel?: string;
  percentage: number;
  isVisible?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  currentStepLabel,
  nextStepLabel,
  percentage,
  isVisible = true
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Trigger animation on percentage change
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [percentage]);

  useEffect(() => {
    // Check for mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isVisible) return null;

  const progressSize = isMobile ? 80 : 120;
  const containerClasses = `
    fixed z-50 
    ${isMobile 
      ? 'bottom-4 right-4' 
      : 'right-6 top-1/2 -translate-y-1/2 lg:right-12'
    }
    flex flex-col items-center gap-3
    p-4 bg-gray-800/80 backdrop-blur-sm rounded-2xl
    shadow-xl border border-gray-700/50
    transition-all duration-300 ease-out
    ${isAnimating ? 'scale-105' : 'scale-100'}
    hover:shadow-2xl hover:border-gray-600/50
  `;

  return (
    <div className={containerClasses}>
      {/* Progress Ring */}
      <div className="relative">
        <CircularProgress 
          percentage={percentage} 
          size={progressSize}
          strokeWidth={isMobile ? 6 : 8}
        />
        
        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white`}>
            {Math.round(percentage)}%
          </span>
          <span className="text-xs text-gray-400">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
      </div>
      
      {/* Step Labels - Hide on very small screens */}
      {(!isMobile || window.innerWidth > 400) && (
        <div className="text-center space-y-2 max-w-[150px]">
          {/* Current Step */}
          <div className="animate-slide-up">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              Current
            </p>
            <p className="text-sm font-semibold text-white truncate">
              {currentStepLabel}
            </p>
          </div>
          
          {/* Next Step */}
          {nextStepLabel && (
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Next
              </p>
              <p className="text-sm text-gray-300 truncate">
                {nextStepLabel}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Visual indicator dots for steps */}
      <div className="flex gap-1 mt-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`
              h-1.5 transition-all duration-300
              ${i < currentStep 
                ? 'w-3 bg-gradient-to-r from-purple-500 to-pink-500' 
                : i === currentStep
                  ? 'w-6 bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse'
                  : 'w-1.5 bg-gray-600'
              }
              rounded-full
            `}
          />
        ))}
      </div>
    </div>
  );
};