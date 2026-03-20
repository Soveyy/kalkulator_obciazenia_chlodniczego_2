import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  id?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, className = '', as: Component = 'div', id }, ref) => {
  const baseClasses = "bg-white dark:bg-slate-800 p-4 lg:p-5 rounded-lg shadow-md transition-colors duration-300";
  // Cast to any to resolve TS error: "Type '...' is not assignable to type 'never'"
  const Tag = Component as any;
  return (
    <Tag id={id} className={`${baseClasses} ${className}`} ref={ref}>
      {children}
    </Tag>
  );
});

Card.displayName = 'Card';

export default Card;