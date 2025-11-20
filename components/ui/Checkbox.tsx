
import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, className, ...props }, ref) => {
  return (
    <div className={`flex items-center ${className || ''}`}>
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        {...props}
      />
      <label htmlFor={id} className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;
