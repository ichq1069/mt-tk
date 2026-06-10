import React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  className?: string;
  circleClassName?: string;
  progressClassName?: string;
}

export function CircularProgress({
  value,
  size = 60,
  strokeWidth = 4,
  className,
  circleClassName,
  progressClassName,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* 背景圆 */}
        <circle
          className={cn("text-muted stroke-current", circleClassName)}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* 进度圆 */}
        <circle
          className={cn("text-primary stroke-current transition-all duration-300 ease-in-out", progressClassName)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* 文本显示 */}
      <span className="absolute text-[10px] font-bold text-white">
        {Math.round(value)}%
      </span>
    </div>
  );
}
