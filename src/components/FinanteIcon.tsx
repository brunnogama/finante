import React, { useState } from 'react';

export const FinanteIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  const [imageError, setImageError] = useState(false);

  if (!imageError) {
    return (
      <img
        src="/finante.png"
        alt="Finante"
        width={size}
        height={size}
        onError={() => setImageError(true)}
        className={`object-contain rounded-xl select-none ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background/Base */}
      <rect width="100" height="100" rx="24" fill="var(--accent-color, #10B981)" />
      
      {/* Geometric 'F' merging into upward trend */}
      <path 
        d="M32 28H64C68.4183 28 72 31.5817 72 36C72 40.4183 68.4183 44 64 44H48V52H60C64.4183 52 68 55.5817 68 60C68 64.4183 64.4183 68 60 68H48V76C48 80.4183 44.4183 84 40 84C35.5817 84 32 80.4183 32 76V28Z" 
        fill="white" 
      />
      <path 
        d="M60 44L72 32L84 44" 
        stroke="white" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};

