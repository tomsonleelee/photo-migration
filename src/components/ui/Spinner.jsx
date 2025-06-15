import { Loader2 } from 'lucide-react';

const Spinner = ({
  size = 'md',
  variant = 'primary',
  className = '',
  ...props
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };
  
  const variants = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    white: 'text-white',
  };
  
  return (
    <Loader2 
      className={`animate-spin ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

// 全屏載入組件
const FullScreenSpinner = ({ 
  message = '載入中...', 
  variant = 'primary',
  className = '' 
}) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90 ${className}`}>
    <div className="text-center">
      <Spinner size="xl" variant={variant} />
      {message && (
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      )}
    </div>
  </div>
);

// 內聯載入組件
const InlineSpinner = ({ 
  message = '載入中...', 
  variant = 'primary',
  size = 'md',
  className = '' 
}) => (
  <div className={`flex items-center justify-center space-x-2 ${className}`}>
    <Spinner size={size} variant={variant} />
    {message && (
      <span className="text-sm text-gray-600">{message}</span>
    )}
  </div>
);

// 按鈕載入組件
const ButtonSpinner = ({ 
  size = 'sm',
  variant = 'white',
  className = '' 
}) => (
  <Spinner size={size} variant={variant} className={className} />
);

// 卡片載入組件
const CardSpinner = ({ 
  message = '載入中...', 
  variant = 'primary',
  className = '' 
}) => (
  <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
    <Spinner size="lg" variant={variant} />
    {message && (
      <p className="mt-4 text-sm text-gray-600">{message}</p>
    )}
  </div>
);

// 骨架屏組件
const Skeleton = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '',
  animated = true 
}) => (
  <div 
    className={`bg-gray-200 rounded ${width} ${height} ${animated ? 'animate-pulse' : ''} ${className}`}
  />
);

// 骨架屏文本行
const SkeletonText = ({ 
  lines = 3, 
  className = '',
  lastLineWidth = 'w-3/4' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton 
        key={index}
        width={index === lines - 1 ? lastLineWidth : 'w-full'}
        height="h-4"
      />
    ))}
  </div>
);

// 骨架屏卡片
const SkeletonCard = ({ className = '' }) => (
  <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton width="w-12" height="h-12" className="rounded-full" />
      <div className="flex-1">
        <Skeleton width="w-1/2" height="h-4" className="mb-2" />
        <Skeleton width="w-1/3" height="h-3" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

Spinner.FullScreen = FullScreenSpinner;
Spinner.Inline = InlineSpinner;
Spinner.Button = ButtonSpinner;
Spinner.Card = CardSpinner;
Spinner.Skeleton = Skeleton;
Spinner.SkeletonText = SkeletonText;
Spinner.SkeletonCard = SkeletonCard;

export default Spinner; 