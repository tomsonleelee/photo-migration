import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const Dropdown = ({
  options = [],
  value,
  onChange,
  placeholder = '請選擇...',
  disabled = false,
  searchable = false,
  multiple = false,
  className = '',
  size = 'md',
  variant = 'default',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // 處理點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 當開啟時聚焦搜尋框
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variants = {
    default: 'border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-300 bg-white hover:border-red-400 focus:border-red-500 focus:ring-red-500',
  };

  // 過濾選項
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // 獲取顯示文本
  const getDisplayText = () => {
    if (multiple) {
      if (!value || value.length === 0) return placeholder;
      if (value.length === 1) {
        const option = options.find(opt => opt.value === value[0]);
        return option ? option.label : placeholder;
      }
      return `已選擇 ${value.length} 項`;
    } else {
      if (!value) return placeholder;
      const option = options.find(opt => opt.value === value);
      return option ? option.label : placeholder;
    }
  };

  // 處理選項點擊
  const handleOptionClick = (optionValue) => {
    if (multiple) {
      const newValue = value || [];
      const isSelected = newValue.includes(optionValue);
      
      if (isSelected) {
        onChange(newValue.filter(v => v !== optionValue));
      } else {
        onChange([...newValue, optionValue]);
      }
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // 檢查選項是否被選中
  const isOptionSelected = (optionValue) => {
    if (multiple) {
      return value && value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`} {...props}>
      {/* 觸發按鈕 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between border rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizes[size]} ${variants[variant]}
        `}
      >
        <span className={`truncate ${!value || (multiple && (!value || value.length === 0)) ? 'text-gray-500' : 'text-gray-900'}`}>
          {getDisplayText()}
        </span>
        <ChevronDown 
          className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* 搜尋框 */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋..."
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* 選項列表 */}
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                {searchTerm ? '找不到符合的選項' : '沒有可用選項'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionClick(option.value)}
                  disabled={option.disabled}
                  className={`
                    w-full px-4 py-2 text-left text-sm flex items-center justify-between
                    hover:bg-gray-100 focus:outline-none focus:bg-gray-100
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isOptionSelected(option.value) ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                  `}
                >
                  <div className="flex items-center">
                    {option.icon && (
                      <span className="mr-3 flex-shrink-0">
                        {option.icon}
                      </span>
                    )}
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-500">{option.description}</div>
                      )}
                    </div>
                  </div>
                  
                  {isOptionSelected(option.value) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* 多選操作 */}
          {multiple && filteredOptions.length > 0 && (
            <div className="border-t border-gray-200 p-2 flex justify-between">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                清除全部
              </button>
              <button
                type="button"
                onClick={() => onChange(filteredOptions.map(opt => opt.value))}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                選擇全部
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 簡化版的 Select 組件
const Select = ({
  options = [],
  value,
  onChange,
  placeholder = '請選擇...',
  disabled = false,
  className = '',
  size = 'md',
  ...props
}) => {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        w-full border border-gray-300 rounded-md bg-white
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${size === 'sm' ? 'px-3 py-1.5 text-sm' : 
          size === 'lg' ? 'px-6 py-3 text-base' : 
          'px-4 py-2 text-sm'}
        ${className}
      `}
      {...props}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option 
          key={option.value} 
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

Dropdown.Select = Select;

export default Dropdown; 