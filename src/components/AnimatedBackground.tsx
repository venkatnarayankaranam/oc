import React from 'react';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating circles */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/20 rounded-full animate-float blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-300/20 rounded-full animate-float-slow blur-xl" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-purple-200/20 rounded-full animate-float blur-xl" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-pink-200/20 rounded-full animate-float-slow blur-xl" style={{ animationDelay: '3s' }}></div>
        
        {/* Morphing shapes */}
        <div className="absolute top-1/4 left-1/2 w-48 h-48 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 animate-morph blur-2xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-100/20 to-pink-100/20 animate-morph blur-2xl" style={{ animationDelay: '4s' }}></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBackground; 