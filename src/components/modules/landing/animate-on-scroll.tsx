'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimateOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export function AnimateOnScroll({
  children,
  className,
  delay = 0,
  threshold = 0.15,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const delayClass =
    delay === 1
      ? 'lp-delay-1'
      : delay === 2
        ? 'lp-delay-2'
        : delay === 3
          ? 'lp-delay-3'
          : delay === 4
            ? 'lp-delay-4'
            : delay === 5
              ? 'lp-delay-5'
              : delay === 6
                ? 'lp-delay-6'
                : '';

  return (
    <div
      ref={ref}
      className={cn(
        'opacity-0',
        visible && `lp-visible ${delayClass}`,
        className
      )}
    >
      {children}
    </div>
  );
}
