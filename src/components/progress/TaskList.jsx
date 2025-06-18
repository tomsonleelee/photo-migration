import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ClockIcon,
  PlayIcon,
  PauseIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const TaskList = ({
  files = {},
  onRetry = () => {},
  onCancel = () => {},
  onViewDetails = () => {},
  showFilters = true,
  showSearch = true,
  maxHeight = '400px',
  className = ''
}) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFile, setExpandedFile] = useState(null);

  // Convert files object to array
  const fileArray = useMemo(() => {
    return Object.values(files);
  }, [files]);

  // Filter files
  const filteredFiles = useMemo(() => {
    let filtered = fileArray;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(file => file.status === filter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(term) ||
        file.source?.toLowerCase().includes(term) ||
        file.destination?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'startTime':
          aValue = a.startTime ? new Date(a.startTime).getTime() : 0;
          bValue = b.startTime ? new Date(b.startTime).getTime() : 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [fileArray, filter, searchTerm, sortBy, sortOrder]);

  // Status counts
  const statusCounts = useMemo(() => {
    return fileArray.reduce((counts, file) => {
      counts[file.status] = (counts[file.status] || 0) + 1;
      counts.all = (counts.all || 0) + 1;
      return counts;
    }, {});
  }, [fileArray]);

  // Status icons
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'in-progress':
        return <PlayIcon className="w-5 h-5 text-blue-500" />;
      case 'paused':
        return <PauseIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString();
  };

  // Calculate duration
  const calculateDuration = (startTime, endTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end - start;
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            File Migration Tasks
          </h3>
          <span className="text-sm text-gray-500">
            {filteredFiles.length} of {fileArray.length} files
          </span>
        </div>

        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="space-y-3">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Filters and Sort */}
            {showFilters && (
              <div className="flex items-center space-x-4">
                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="w-4 h-4 text-gray-400" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All ({statusCounts.all || 0})</option>
                    <option value="pending">Pending ({statusCounts.pending || 0})</option>
                    <option value="in-progress">In Progress ({statusCounts['in-progress'] || 0})</option>
                    <option value="completed">Completed ({statusCounts.completed || 0})</option>
                    <option value="failed">Failed ({statusCounts.failed || 0})</option>
                    <option value="paused">Paused ({statusCounts.paused || 0})</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="progress">Progress</option>
                    <option value="status">Status</option>
                    <option value="startTime">Start Time</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUpIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ArrowDownIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File List */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        <AnimatePresence>
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || filter !== 'all' ? 'No files match your criteria' : 'No files to display'}
            </div>
          ) : (
            filteredFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="border-b border-gray-100 last:border-b-0"
              >
                {/* File Row */}
                <div className="p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(file.status)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </span>
                            {file.startTime && (
                              <span className="text-xs text-gray-500">
                                Started: {formatTime(file.startTime)}
                              </span>
                            )}
                            {file.endTime && (
                              <span className="text-xs text-gray-500">
                                Duration: {calculateDuration(file.startTime, file.endTime)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {file.status === 'failed' && (
                            <button
                              onClick={() => onRetry(file.id)}
                              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded"
                            >
                              Retry
                            </button>
                          )}
                          {file.status === 'in-progress' && (
                            <button
                              onClick={() => onCancel(file.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 rounded"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {expandedFile === file.id ? (
                              <ArrowUpIcon className="w-4 h-4" />
                            ) : (
                              <ArrowDownIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {file.status === 'in-progress' && (
                        <div className="mt-2">
                          <ProgressBar
                            percentage={file.progress || 0}
                            status="active"
                            size="sm"
                            showLabel={false}
                            showPercentage={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedFile === file.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Source:</span>
                            <p className="text-gray-600 break-all">{file.source || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Destination:</span>
                            <p className="text-gray-600 break-all">{file.destination || 'Unknown'}</p>
                          </div>
                          {file.error && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-red-700">Error:</span>
                              <p className="text-red-600 break-words">{file.error}</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => onViewDetails(file)}
                            className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded"
                          >
                            View Details
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaskList; 