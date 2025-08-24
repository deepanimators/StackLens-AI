import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentStep?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  status, 
  currentStep, 
  className = '' 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return currentStep || 'Processing...';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">
          {getStatusText()}
        </span>
        <span className="text-sm text-gray-500">
          {clampedProgress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {status === 'processing' && currentStep && (
        <div className="mt-1 text-xs text-gray-600">
          {currentStep}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
