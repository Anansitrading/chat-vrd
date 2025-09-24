import { useState, useCallback, useEffect } from 'react';

export interface ProgressStep {
  id: string;
  label: string;
  percentage: number;
}

// Define the conversation progress steps
export const PROGRESS_STEPS: ProgressStep[] = [
  { id: 'welcome', label: 'Welcome', percentage: 0 },
  { id: 'initial_rating', label: 'Initial Rating', percentage: 10 },
  { id: 'project_overview', label: 'Project Overview', percentage: 20 },
  { id: 'primary_goal', label: 'Primary Goal', percentage: 30 },
  { id: 'target_audience', label: 'Target Audience', percentage: 40 },
  { id: 'video_style', label: 'Video Style & Tone', percentage: 50 },
  { id: 'narrative_approach', label: 'Narrative Approach', percentage: 60 },
  { id: 'visual_elements', label: 'Visual Elements', percentage: 70 },
  { id: 'technical_specs', label: 'Technical Specs', percentage: 80 },
  { id: 'production_constraints', label: 'Production Details', percentage: 90 },
  { id: 'review', label: 'Review & Finalize', percentage: 100 }
];

export const useProgress = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentStep = PROGRESS_STEPS[currentStepIndex];
  const nextStep = PROGRESS_STEPS[currentStepIndex + 1] || null;
  const totalSteps = PROGRESS_STEPS.length - 1; // Exclude welcome step from count

  // Calculate display values
  const displayStep = Math.max(currentStepIndex, 1); // Don't show step 0
  const percentage = currentStep.percentage;

  // Update progress based on message content
  const updateProgressByContent = useCallback((messageContent: string) => {
    const lowerContent = messageContent.toLowerCase();
    
    // Map keywords to progress steps
    if (lowerContent.includes('rate your') || lowerContent.includes('scale of')) {
      setCurrentStepIndex(1); // Initial Rating
    } else if (lowerContent.includes('project overview') || lowerContent.includes('tell me about your video')) {
      setCurrentStepIndex(2); // Project Overview
    } else if (lowerContent.includes('primary goal') || lowerContent.includes('main objective')) {
      setCurrentStepIndex(3); // Primary Goal
    } else if (lowerContent.includes('target audience') || lowerContent.includes('who is this for')) {
      setCurrentStepIndex(4); // Target Audience
    } else if (lowerContent.includes('video style') || lowerContent.includes('tone')) {
      setCurrentStepIndex(5); // Video Style
    } else if (lowerContent.includes('narrative') || lowerContent.includes('storytelling')) {
      setCurrentStepIndex(6); // Narrative Approach
    } else if (lowerContent.includes('visual') && lowerContent.includes('element')) {
      setCurrentStepIndex(7); // Visual Elements
    } else if (lowerContent.includes('technical') || lowerContent.includes('specification')) {
      setCurrentStepIndex(8); // Technical Specs
    } else if (lowerContent.includes('production') || lowerContent.includes('constraint')) {
      setCurrentStepIndex(9); // Production Constraints
    } else if (lowerContent.includes('review') || lowerContent.includes('finalize')) {
      setCurrentStepIndex(10); // Review
    }
  }, []);

  // Manual progress control
  const goToNextStep = useCallback(() => {
    if (currentStepIndex < PROGRESS_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const resetProgress = useCallback(() => {
    setCurrentStepIndex(0);
    setIsVisible(true);
  }, []);

  const hideProgress = useCallback(() => {
    setIsVisible(false);
  }, []);

  const showProgress = useCallback(() => {
    setIsVisible(true);
  }, []);

  // Auto-hide when complete
  useEffect(() => {
    if (percentage === 100) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Hide after 3 seconds at 100%
      return () => clearTimeout(timer);
    }
  }, [percentage]);

  return {
    currentStep: displayStep,
    totalSteps,
    currentStepLabel: currentStep.label,
    nextStepLabel: nextStep?.label,
    percentage,
    isVisible,
    updateProgressByContent,
    goToNextStep,
    goToPreviousStep,
    resetProgress,
    hideProgress,
    showProgress
  };
};