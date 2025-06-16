import { forwardRef } from 'react';

const Card = forwardRef(({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  hover = false,
  ...props
}, ref) => {
  const baseClasses = 'bg-white rounded-lg border border-gray-200';
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };
  
  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };
  
  const hoverEffect = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';
  
  const classes = `${baseClasses} ${paddings[padding]} ${shadows[shadow]} ${hoverEffect} ${className}`;
  
  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// Card 子組件
const CardHeader = forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ children, className = '', ...props }, ref) => (
  <h3 ref={ref} className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
    {children}
  </h3>
));

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(({ children, className = '', ...props }, ref) => (
  <p ref={ref} className={`text-sm text-gray-600 ${className}`} {...props}>
    {children}
  </p>
));

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`mt-4 pt-4 border-t border-gray-200 ${className}`} {...props}>
    {children}
  </div>
));

CardFooter.displayName = 'CardFooter';

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export default Card; 