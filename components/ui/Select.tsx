
import React from 'react';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', children, ...props }, ref) => {
    const baseClasses = "w-full box-border px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow";
    return <select ref={ref} className={`${baseClasses} ${className}`} {...props}>{children}</select>;
});

Select.displayName = 'Select';
export default Select;
