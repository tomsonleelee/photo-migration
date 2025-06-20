import { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

// 基礎輸入框組件
const Input = forwardRef(({
  type = 'text',
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'default',
  leftIcon,
  rightIcon,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variants = {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-300 focus:border-green-500 focus:ring-green-500',
  };

  const currentVariant = error ? 'error' : variant;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={`
            w-full border rounded-md transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
            ${sizes[size]}
            ${variants[currentVariant]}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon || isPassword ? 'pr-10' : ''}
          `}
          disabled={disabled}
          {...props}
        />
        
        {(rightIcon || isPassword) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            ) : (
              <span className="text-gray-400">{rightIcon}</span>
            )}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="mt-1 flex items-center">
          {error && <AlertCircle className="h-4 w-4 text-red-500 mr-1" />}
          <p className={`text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
            {error || helperText}
          </p>
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// 文本區域組件
const Textarea = forwardRef(({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  rows = 3,
  resize = 'vertical',
  ...props
}, ref) => {
  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        rows={rows}
        className={`
          w-full px-4 py-2 text-sm border rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
          ${resizeClasses[resize]}
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
        `}
        disabled={disabled}
        {...props}
      />
      
      {(error || helperText) && (
        <div className="mt-1 flex items-center">
          {error && <AlertCircle className="h-4 w-4 text-red-500 mr-1" />}
          <p className={`text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
            {error || helperText}
          </p>
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// 複選框組件
const Checkbox = forwardRef(({
  label,
  description,
  error,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={className}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            className={`
              h-4 w-4 text-blue-600 border-gray-300 rounded
              focus:ring-blue-500 focus:ring-2 focus:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-300' : ''}
            `}
            disabled={disabled}
            {...props}
          />
        </div>
        
        {label && (
          <div className="ml-3 text-sm">
            <label className={`font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}>
              {label}
            </label>
            {description && (
              <p className="text-gray-500">{description}</p>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-1 flex items-center">
          <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

// 單選框組件
const Radio = forwardRef(({
  options = [],
  value,
  onChange,
  name,
  label,
  error,
  disabled = false,
  direction = 'vertical',
  className = '',
  ...props
}, ref) => {
  const directionClasses = {
    vertical: 'space-y-2',
    horizontal: 'flex space-x-4',
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className={directionClasses[direction]} role="radiogroup" aria-label={label}>
        {options.map((option, index) => {
          const inputId = `${name || 'radio'}-${option.value}-${index}`;
          return (
            <div key={option.value || index} className="flex items-center">
              <input
                ref={index === 0 ? ref : undefined}
                id={inputId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange && onChange(e.target.value)}
                disabled={disabled || option.disabled}
                className={`
                  h-4 w-4 text-blue-600 border-gray-300
                  focus:ring-blue-500 focus:ring-2 focus:ring-offset-0
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error ? 'border-red-300' : ''}
                `}
                {...props}
              />
              <label 
                htmlFor={inputId}
                className={`ml-2 text-sm ${error ? 'text-red-700' : 'text-gray-700'} cursor-pointer`}
              >
                {option.label}
                {option.description && (
                  <span className="block text-xs text-gray-500">{option.description}</span>
                )}
              </label>
            </div>
          );
        })}
      </div>
      
      {error && (
        <div className="mt-1 flex items-center">
          <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';

// 表單組件
const Form = ({ children, onSubmit, className = '', ...props }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className} {...props}>
      {children}
    </form>
  );
};

// 表單組
const FormGroup = ({ children, className = '', ...props }) => (
  <div className={`space-y-4 ${className}`} {...props}>
    {children}
  </div>
);

// 表單行
const FormRow = ({ children, className = '', ...props }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`} {...props}>
    {children}
  </div>
);

// 表單操作區
const FormActions = ({ children, align = 'right', className = '', ...props }) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex ${alignClasses[align]} space-x-3 pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

// 組合導出
Form.Input = Input;
Form.Textarea = Textarea;
Form.Checkbox = Checkbox;
Form.Radio = Radio;
Form.Group = FormGroup;
Form.Row = FormRow;
Form.Actions = FormActions;

export default Form; 