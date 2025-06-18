import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ProgressBar, { CircularProgress, MultiStageProgress } from './ProgressBar';
import TaskList from './TaskList';
import { useProgress } from '../../contexts/ProgressContext';
import useSocketProgress from '../../hooks/useSocketProgress';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const ProgressTracker = ({ 
  showTaskList = true, 
  showStats = true,
  layout = 'horizontal', // horizontal, vertical, compact
  className = '' 
}) => {
  const { progress, socket, formatDuration, isConnected } = useSocketProgress();
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate migration stages
  const migrationStages = [
    { name: 'Preparing', progress: progress.overall.total > 0 ? 100 : 0 },
    { name: 'Downloading', progress: progress.stats.downloadSpeed > 0 ? 50 : 0 },
    { name: 'Processing', progress: progress.stats.processedFiles > 0 ? 75 : 0 },
    { name: 'Uploading', progress: progress.stats.uploadSpeed > 0 ? 25 : 0 },
  ];

  const currentStage = migrationStages.findIndex(stage => stage.progress < 100);

  // Format time remaining
  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return 'Unknown';
    return formatDuration(ms);
  };

  // Calculate speed
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let index = 0;
    let speed = bytesPerSecond;
    
    while (speed >= 1024 && index < units.length - 1) {
      speed /= 1024;
      index++;
    }
    
    return `${speed.toFixed(1)} ${units[index]}`;
  };

  // Handle file actions
  const handleRetryFile = (fileId) => {
    socket.startMigration({ retryFiles: [fileId] });
  };

  const handleCancelFile = (fileId) => {
    // Implementation would depend on backend API
    console.log('Cancel file:', fileId);
  };

  const handleViewFileDetails = (file) => {
    // Implementation would open a modal or navigate to details page
    console.log('View file details:', file);
  };

  // Control handlers
  const handleStart = () => {
    socket.startMigration();
  };

  const handlePause = () => {
    socket.pauseMigration();
  };

  const handleStop = () => {
    socket.stopMigration();
  };

  const handleResume = () => {
    socket.resumeMigration();
  };

  // Layout styles
  const layoutClasses = {
    horizontal: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
    vertical: 'space-y-6',
    compact: 'space-y-4'
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {/* Main Progress Section */}
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {!isConnected && (
              <button
                onClick={socket.reconnect}
                className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Migration Progress</h2>
            <div className="flex items-center space-x-2">
              {!progress.overall.isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={!isConnected || progress.overall.total === 0}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlayIcon className="w-4 h-4" />
                  <span>Start</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePause}
                    className="flex items-center space-x-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    <PauseIcon className="w-4 h-4" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <StopIcon className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {layout === 'compact' ? (
            <ProgressBar
              percentage={progress.overall.percentage}
              status={progress.overall.isRunning ? 'active' : 'pending'}
              label="Overall Progress"
              variant="gradient"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Circular Progress */}
              <div className="flex justify-center">
                <CircularProgress
                  percentage={progress.overall.percentage}
                  size={150}
                  status={progress.overall.isRunning ? 'active' : progress.overall.completed > 0 ? 'completed' : 'pending'}
                  label="Overall"
                />
              </div>

              {/* Statistics */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-xs text-gray-500">Completed</p>
                        <p className="text-lg font-semibold">{progress.overall.completed}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-xs text-gray-500">Failed</p>
                        <p className="text-lg font-semibold">{progress.overall.failed}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">In Progress</p>
                        <p className="text-lg font-semibold">{progress.overall.inProgress}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <ChartBarIcon className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-semibold">{progress.overall.total}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-stage Progress */}
          {layout !== 'compact' && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Migration Stages</h3>
              <MultiStageProgress
                stages={migrationStages}
                currentStage={currentStage}
              />
            </div>
          )}

          {/* Time and Speed Info */}
          {showStats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Time Remaining</p>
                <p className="text-sm font-medium">
                  {formatTimeRemaining(progress.overall.estimatedTime)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Download Speed</p>
                <p className="text-sm font-medium">
                  {formatSpeed(progress.stats.downloadSpeed)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Upload Speed</p>
                <p className="text-sm font-medium">
                  {formatSpeed(progress.stats.uploadSpeed)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task List Section */}
      {showTaskList && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8" aria-label="Tabs">
                {[
                  { id: 'overview', name: 'Overview', count: Object.keys(progress.files).length },
                  { id: 'errors', name: 'Errors', count: progress.errors.length },
                  { id: 'logs', name: 'Logs', count: progress.logs.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <span>{tab.name}</span>
                    {tab.count > 0 && (
                      <span className={`${
                        activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      } inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-0">
              {activeTab === 'overview' && (
                <TaskList
                  files={progress.files}
                  onRetry={handleRetryFile}
                  onCancel={handleCancelFile}
                  onViewDetails={handleViewFileDetails}
                />
              )}

              {activeTab === 'errors' && (
                <div className="p-6">
                  {progress.errors.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No errors reported
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {progress.errors.map((error) => (
                        <motion.div
                          key={error.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-l-4 border-red-400 bg-red-50 p-4"
                        >
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-red-800">
                                {error.message || error.fileName}
                              </p>
                              <p className="text-xs text-red-600 mt-1">
                                {new Date(error.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="p-6 max-h-96 overflow-y-auto">
                  {progress.logs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No logs available
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {progress.logs.slice(-50).reverse().map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`text-xs p-2 rounded ${
                            log.level === 'error' ? 'bg-red-50 text-red-800' :
                            log.level === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                            'bg-gray-50 text-gray-800'
                          }`}
                        >
                          <span className="font-mono text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="ml-2">{log.message}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker; 