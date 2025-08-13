import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',   
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin-slow`}></div>
        {/* Inner ring */}
        <div className={`${sizeClasses[size]} border-4 border-transparent border-t-blue-500 rounded-full animate-spin absolute top-0 left-0`}></div>
        {/* Center dot */}
        <div className={`${size === 'lg' ? 'w-3 h-3' : 'w-2 h-2'} bg-blue-500 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse-slow`}></div>
      </div>
      {text && (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 font-medium animate-pulse-slow">
            {text}
          </p>
          <div className="flex space-x-1 mt-2 justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-slow"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-slow" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-slow" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner; 