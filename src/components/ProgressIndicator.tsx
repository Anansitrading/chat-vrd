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

  const progressSize = isMobile ? 60 : 80;
  const containerClasses = `
    fixed z-50 
    ${isMobile 
      ? 'bottom-4 right-4' 
      : 'top-20 right-6 lg:right-8'
    }
    flex flex-col items-center gap-2
    transition-all duration-300 ease-out
    ${isAnimating ? 'scale-105' : 'scale-100'}
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
          <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-white drop-shadow-lg`}>
            {Math.round(percentage)}%
          </span>
          <span className="text-[10px] text-gray-300 font-medium drop-shadow">
            {currentStep}/{totalSteps}
          </span>
        </div>
      </div>
      
      {/* Step Labels - Show only on desktop, below the ring */}
      {!isMobile && (
        <div className="text-center space-y-1 max-w-[120px] mt-2">
          {/* Current Step */}
          <div className="animate-slide-up">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Current
            </p>
            <p className="text-xs font-semibold text-gray-200 truncate drop-shadow">
              {currentStepLabel}
            </p>
          </div>
          
          {/* Next Step - Only show if not on last step */}
          {nextStepLabel && percentage < 90 && (
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                Next
              </p>
              <p className="text-xs text-gray-400 truncate">
                {nextStepLabel}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Visual indicator dots for steps - Only on desktop */}
      {!isMobile && (
        <div className="flex gap-1 mt-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`
                h-1 transition-all duration-300
                ${i < currentStep 
                  ? 'w-2 bg-gradient-to-r from-purple-500 to-pink-500 opacity-80' 
                  : i === currentStep
                    ? 'w-4 bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse'
                    : 'w-1 bg-gray-600 opacity-50'
                }
                rounded-full
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};