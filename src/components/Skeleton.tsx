import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'text',
  lines = 1
}) => {
  const baseClasses = 'animate-pulse-slow bg-gray-200 dark:bg-gray-700';

  const variants = {
    text: 'h-4 rounded',
    circular: 'w-12 h-12 rounded-full',
    rectangular: 'h-32 rounded-lg',
    card: 'h-48 rounded-lg'
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div 
            key={index}
            className={`${baseClasses} ${variants.text} ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
};

export default Skeleton; 