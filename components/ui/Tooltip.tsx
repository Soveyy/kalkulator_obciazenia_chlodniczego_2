import React, { useState } from 'react';
import { InformationCircleIcon } from '../Icons';

interface TooltipProps {
  text?: string;
  content?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, content, position = 'bottom', children }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const displayValue = text || content;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  if (!displayValue) {
    return children ? <>{children}</> : null;
  }

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsClicked(false);
  };

  const handleInteraction = () => {
    setIsClicked(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
      setIsClicked(false);
    }
  };

  const visible = isHovered && !isClicked && !isFocused;

  if (children) {
    return (
      <div 
        ref={containerRef}
        className="group relative w-full block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleInteraction}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
        <span className={`absolute z-50 w-max max-w-[220px] transform rounded-md bg-slate-800 px-2.5 py-2 text-[11px] leading-tight text-white transition-all dark:bg-slate-700 pointer-events-none shadow-xl border border-white/10 normal-case text-left font-normal ${positionClasses[position]} ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
          {displayValue}
        </span>
      </div>
    );
  }

  return (
    <span 
      className="group relative ml-1 inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleInteraction}
    >
      <InformationCircleIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-help" />
      <span className={`absolute z-50 w-max max-w-[180px] transform rounded-md bg-slate-800 px-2 py-1.5 text-[11px] leading-tight text-white transition-all dark:bg-slate-700 pointer-events-none shadow-xl border border-white/10 normal-case text-left font-normal ${positionClasses[position]} ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        {displayValue}
      </span>
    </span>
  );
};

export default Tooltip;