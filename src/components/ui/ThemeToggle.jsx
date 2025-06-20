import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';

const ThemeToggle = ({ variant = 'icon' }) => {
  const { theme, currentTheme, changeTheme } = useTheme();

  const themes = [
    { value: 'light', label: '淺色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'system', label: '系統', icon: Monitor }
  ];

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <select
          value={theme}
          onChange={(e) => changeTheme(e.target.value)}
          className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {themes.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => changeTheme(value)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              theme === value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    );
  }

  // 預設為icon variant
  const currentThemeConfig = themes.find(t => t.value === currentTheme);
  const Icon = currentThemeConfig?.icon || Sun;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        changeTheme(nextTheme);
      }}
      title={`切換到${currentTheme === 'light' ? '深色' : '淺色'}模式`}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
};

export default ThemeToggle;