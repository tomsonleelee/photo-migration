import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({
  percentage = 0,
  status = 'pending', // pending, active, completed, error, paused
  showLabel = true,
  showPercentage = true,
  size = 'md', // sm, md, lg
  variant = 'default', // default, gradient, rounded
  label = '',
  animationDuration = 0.5,
  className = '',
  ...props
}) => {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Size classes
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  };

  // Status colors
  const statusColors = {
    pending: 'bg-gray-200',
    active: 'bg-blue-500',
    completed: 'bg-green-500',
    error: 'bg-red-500',
    paused: 'bg-yellow-500'
  };

  // Progress colors (for the filled portion)
  const progressColors = {
    pending: 'bg-gray-400',
    active: 'bg-blue-600',
    completed: 'bg-green-600',
    error: 'bg-red-600',
    paused: 'bg-yellow-600'
  };

  // Gradient variants
  const gradientColors = {
    pending: 'from-gray-400 to-gray-500',
    active: 'from-blue-400 to-blue-600',
    completed: 'from-green-400 to-green-600',
    error: 'from-red-400 to-red-600',
    paused: 'from-yellow-400 to-yellow-600'
  };

  // Base container classes
  const containerClasses = `
    relative overflow-hidden
    ${sizeClasses[size]}
    ${variant === 'rounded' ? 'rounded-full' : 'rounded'}
    ${statusColors[status]}
    ${className}
  `;

  // Progress bar classes
  const progressClasses = variant === 'gradient'
    ? `bg-gradient-to-r ${gradientColors[status]}`
    : progressColors[status];

  return (
    <div className="w-full">
      {/* Label and percentage */}
      {(showLabel || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {showLabel && (
            <span className="text-sm font-medium text-gray-700">
              {label || `Migration ${status}`}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">
              {clampedPercentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div className={containerClasses} {...props}>
        {/* Progress fill */}
        <motion.div
          className={`h-full ${progressClasses} ${variant === 'rounded' ? 'rounded-full' : 'rounded'}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercentage}%` }}
          transition={{ 
            duration: animationDuration,
            ease: "easeOut"
          }}
        />

        {/* Animated stripe for active status */}
        {status === 'active' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        )}

        {/* Error pulse animation */}
        {status === 'error' && (
          <motion.div
            className="absolute inset-0 bg-red-400 opacity-50"
            animate={{
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>
    </div>
  );
};

// Circular progress component
export const CircularProgress = ({
  percentage = 0,
  size = 120,
  strokeWidth = 8,
  status = 'active',
  showLabel = true,
  label = '',
  className = '',
  children
}) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  const statusColors = {
    pending: 'text-gray-400',
    active: 'text-blue-500',
    completed: 'text-green-500',
    error: 'text-red-500',
    paused: 'text-yellow-500'
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={statusColors[status]}
          style={{
            strokeDasharray,
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {children || (
            <>
              <div className={`text-2xl font-bold ${statusColors[status]}`}>
                {clampedPercentage.toFixed(0)}%
              </div>
              {showLabel && label && (
                <div className="text-xs text-gray-500 mt-1">
                  {label}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Multiple progress bars for different stages
export const MultiStageProgress = ({
  stages = [],
  currentStage = 0,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {stages.map((stage, index) => {
        let status = 'pending';
        let percentage = 0;

        if (index < currentStage) {
          status = 'completed';
          percentage = 100;
        } else if (index === currentStage) {
          status = 'active';
          percentage = stage.progress || 0;
        }

        return (
          <ProgressBar
            key={index}
            percentage={percentage}
            status={status}
            label={stage.name}
            showPercentage={index === currentStage}
            size="sm"
          />
        );
      })}
    </div>
  );
};

export default ProgressBar; 