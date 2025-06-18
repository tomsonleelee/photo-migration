import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const Summary = ({
  stats = {},
  overall = {},
  showDetailed = true,
  className = ''
}) => {
  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format speed
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '0 B/s';
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
    return Math.round(bytesPerSecond / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Calculate elapsed time
  const elapsedTime = overall.startTime ? 
    (overall.endTime ? new Date(overall.endTime) - new Date(overall.startTime) : 
     new Date() - new Date(overall.startTime)) : 0;

  const summaryStats = [
    {
      title: 'Total Files',
      value: overall.total || 0,
      icon: DocumentIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Completed',
      value: overall.completed || 0,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Failed',
      value: overall.failed || 0,
      icon: ExclamationCircleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'In Progress',
      value: overall.inProgress || 0,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  const detailedStats = [
    {
      title: 'Success Rate',
      value: overall.completed + overall.failed > 0 ? 
        `${((overall.completed / (overall.completed + overall.failed)) * 100).toFixed(1)}%` : 
        '0%',
      subtitle: 'Completion rate'
    },
    {
      title: 'Elapsed Time',
      value: formatDuration(elapsedTime),
      subtitle: overall.isRunning ? 'Currently running' : 'Total duration'
    },
    {
      title: 'Download Speed',
      value: formatSpeed(stats.downloadSpeed),
      subtitle: 'Current rate'
    },
    {
      title: 'Upload Speed',
      value: formatSpeed(stats.uploadSpeed),
      subtitle: 'Current rate'
    },
    {
      title: 'Total Downloaded',
      value: formatFileSize(stats.totalDownloaded),
      subtitle: 'Data transferred'
    },
    {
      title: 'Total Uploaded',
      value: formatFileSize(stats.totalUploaded),
      subtitle: 'Data transferred'
    }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-6 h-6 text-white" />
          <h2 className="text-xl font-semibold text-white">Migration Summary</h2>
        </div>
        {overall.startTime && (
          <p className="text-blue-100 text-sm mt-1">
            Started {new Date(overall.startTime).toLocaleString()}
          </p>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {summaryStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${stat.bgColor} rounded-lg p-4`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{overall.percentage?.toFixed(1) || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overall.percentage || 0}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Detailed Stats */}
        {showDetailed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {detailedStats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 4) * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-xs font-medium text-gray-500 uppercase">{stat.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Migration Status */}
        <div className="mt-6 p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
          <div className="flex items-center">
            <CalendarIcon className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Migration Status: {overall.isRunning ? 'Running' : overall.completed > 0 ? 'Completed' : 'Ready'}
              </p>
              {overall.estimatedTime && overall.isRunning && (
                <p className="text-xs text-blue-700 mt-1">
                  Estimated time remaining: {formatDuration(overall.estimatedTime)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary; 