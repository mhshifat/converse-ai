// Shared BentoGrid component for creative, responsive layouts
import React from 'react';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className }) => (
  <div
    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bento-grid ${className ?? ''}`}
    style={{ minHeight: '60vh' }}
  >
    {children}
  </div>
);
