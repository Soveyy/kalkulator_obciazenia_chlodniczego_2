
import React, { useEffect, useState } from 'react';
import { useCalculator } from '../contexts/CalculatorContext';

interface ToastProps {
  id: number;
  message: string;
  type: 'info' | 'success' | 'danger';
}

const Toast: React.FC<ToastProps> = ({ id, message, type }) => {
  const { dispatch } = useCalculator();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3500);

    const removeTimer = setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, 4000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [id, dispatch]);

  const baseClasses = "px-4 py-3 rounded-md shadow-lg text-white font-semibold transition-all duration-300";
  const typeClasses = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    danger: 'bg-red-500',
  };

  const animationClasses = isExiting 
    ? 'opacity-0 translate-x-full' 
    : 'opacity-100 translate-x-0';

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${animationClasses}`}>
      {message}
    </div>
  );
};

export default Toast;
