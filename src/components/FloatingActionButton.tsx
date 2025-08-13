import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  children,
  onClick,
  className = '',
  position = 'bottom-right',
  size = 'md'
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-50 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg',
        'transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-xl',
        'active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'animate-float-slow hover:animate-none',
        positionClasses[position],
        sizeClasses[size],
        className
      )}
    >
      <div className="flex items-center justify-center w-full h-full">
        {children}
      </div>
    </button>
  );
};

export default FloatingActionButton; 