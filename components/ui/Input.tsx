
import React from 'react';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => {
    const baseClasses = "w-full box-border px-2 py-1.5 lg:px-3 lg:py-2 text-sm lg:text-base border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200";
    return <input ref={ref} className={`${baseClasses} ${className}`} {...props} />;
});

Input.displayName = 'Input';
export default Input;
