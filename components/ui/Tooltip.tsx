import React from 'react';
import { InformationCircleIcon } from '../Icons';

interface TooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, position = 'bottom', children }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span className="group relative ml-1 inline-flex items-center">
      {children || <InformationCircleIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-help" />}
      <span className={`absolute z-50 w-max max-w-xs scale-95 transform rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 dark:bg-slate-700 pointer-events-none ${positionClasses[position]}`}>
        {text}
      </span>
    </span>
  );
};

export default Tooltip;