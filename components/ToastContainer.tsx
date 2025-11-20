
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts } = useCalculator();

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default ToastContainer;
