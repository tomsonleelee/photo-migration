import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const ErrorLog = ({
  errors = [],
  warnings = [],
  onClearLogs,
  onRetryFailed,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, errors, warnings
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('timestamp'); // timestamp, type, file

  // Combine errors and warnings
  const allLogs = useMemo(() => {
    const combined = [
      ...errors.map(error => ({ ...error, type: 'error' })),
      ...warnings.map(warning => ({ ...warning, type: 'warning' }))
    ];

    // Filter by type
    const filtered = combined.filter(log => {
      if (filterType === 'errors') return log.type === 'error';
      if (filterType === 'warnings') return log.type === 'warning';
      return true;
    });

    // Filter by search term
    const searched = filtered.filter(log => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        log.message?.toLowerCase().includes(searchLower) ||
        log.fileName?.toLowerCase().includes(searchLower) ||
        log.details?.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    return searched.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'file':
          return (a.fileName || '').localeCompare(b.fileName || '');
        default:
          return 0;
      }
    });
  }, [errors, warnings, filterType, searchTerm, sortBy]);

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You might want to show a toast notification here
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return XCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return {
          icon: 'text-red-500',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900'
        };
      case 'warning':
        return {
          icon: 'text-yellow-500',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-900'
        };
      default:
        return {
          icon: 'text-blue-500',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900'
        };
    }
  };

  const errorCount = errors.length;
  const warningCount = warnings.length;

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ExclamationCircleIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Error Log</h2>
            <div className="flex items-center space-x-4 ml-4">
              {errorCount > 0 && (
                <span className="bg-red-800 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {errorCount} Errors
                </span>
              )}
              {warningCount > 0 && (
                <span className="bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {warningCount} Warnings
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onRetryFailed && errorCount > 0 && (
              <button
                onClick={onRetryFailed}
                className="bg-white text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Retry Failed
              </button>
            )}
            {onClearLogs && allLogs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="bg-red-800 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-900 transition-colors flex items-center space-x-1"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({errorCount + warningCount})</option>
              <option value="errors">Errors ({errorCount})</option>
              <option value="warnings">Warnings ({warningCount})</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="timestamp">Sort by Time</option>
            <option value="type">Sort by Type</option>
            <option value="file">Sort by File</option>
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="max-h-96 overflow-y-auto">
        {allLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <InformationCircleIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No logs to display</p>
            {filterType !== 'all' && (
              <p className="text-sm mt-1">Try changing the filter or search term</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            <AnimatePresence>
              {allLogs.map((log, index) => {
                const Icon = getLogIcon(log.type);
                const colors = getLogColor(log.type);
                const isExpanded = expandedItems.has(log.id || index);

                return (
                  <motion.div
                    key={log.id || index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 hover:bg-gray-50 transition-colors ${colors.bg} ${colors.border} border-l-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Icon className={`w-5 h-5 mt-0.5 ${colors.icon}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium ${colors.text}`}>
                              {log.message || 'Unknown error'}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown time'}
                              </span>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Copy log details"
                              >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                              </button>
                              {(log.details || log.stack) && (
                                <button
                                  onClick={() => toggleExpanded(log.id || index)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDownIcon className="w-4 h-4" />
                                  ) : (
                                    <ChevronRightIcon className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {log.fileName && (
                            <p className="text-sm text-gray-600 mt-1">
                              File: {log.fileName}
                            </p>
                          )}

                          <AnimatePresence>
                            {isExpanded && (log.details || log.stack) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3 overflow-hidden"
                              >
                                <div className="bg-gray-100 rounded-lg p-3">
                                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                    {log.details || log.stack}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      {allLogs.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {allLogs.length} of {errorCount + warningCount} total logs
          </p>
        </div>
      )}
    </div>
  );
};

export default ErrorLog; 