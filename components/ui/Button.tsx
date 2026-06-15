
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'action' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', fullWidth = false, className = '', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 hover:-translate-y-[2px] hover:shadow-md";
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    action: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    secondary: 'bg-slate-500 hover:bg-slate-600 focus:ring-slate-400',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs lg:text-sm',
    md: 'px-3 py-1.5 lg:px-4 lg:py-2 text-sm lg:text-base',
    lg: 'px-5 py-3 text-base lg:text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
