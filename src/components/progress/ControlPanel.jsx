import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  CogIcon,
  InformationCircleIcon,
  ClockIcon,
  ServerIcon,
  WifiIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const ControlPanel = ({
  migrationState = {},
  connectionState = {},
  onStart,
  onPause,
  onStop,
  onReset,
  onRetryFailed,
  onShowSettings,
  className = ''
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const {
    isRunning = false,
    isPaused = false,
    status = 'idle',
    canStart = true,
    canPause = false,
    canStop = false,
    canReset = true,
    overall = {}
  } = migrationState;

  const {
    isConnected = false,
    isConnecting = false,
    lastConnectionError = null
  } = connectionState;

  const getStatusInfo = () => {
    switch (status) {
      case 'running':
        return {
          text: 'Migration Running',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'paused':
        return {
          text: 'Migration Paused',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'completed':
        return {
          text: 'Migration Completed',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'failed':
        return {
          text: 'Migration Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'stopped':
        return {
          text: 'Migration Stopped',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
      default:
        return {
          text: 'Ready to Start',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const getConnectionInfo = () => {
    if (isConnecting) {
      return {
        text: 'Connecting...',
        color: 'text-yellow-600',
        icon: ClockIcon
      };
    } else if (isConnected) {
      return {
        text: 'Connected',
        color: 'text-green-600',
        icon: WifiIcon
      };
    } else {
      return {
        text: 'Disconnected',
        color: 'text-red-600',
        icon: ServerIcon
      };
    }
  };

  const handleStart = () => {
    if (onStart && canStart) {
      onStart();
    }
  };

  const handlePause = () => {
    if (onPause && canPause) {
      onPause();
    }
  };

  const handleStop = () => {
    if (canStop) {
      setShowConfirmStop(true);
    }
  };

  const handleConfirmStop = () => {
    if (onStop) {
      onStop();
    }
    setShowConfirmStop(false);
  };

  const handleReset = () => {
    if (canReset) {
      setShowConfirmReset(true);
    }
  };

  const handleConfirmReset = () => {
    if (onReset) {
      onReset();
    }
    setShowConfirmReset(false);
  };

  const statusInfo = getStatusInfo();
  const connectionInfo = getConnectionInfo();

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CogIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Migration Control</h2>
          </div>
          <button
            onClick={onShowSettings}
            className="bg-blue-800 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-900 transition-colors"
          >
            Settings
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Status Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Status</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Migration Status */}
            <div className={`p-4 rounded-lg border ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Migration</p>
                  <p className={`text-lg font-semibold ${statusInfo.color}`}>
                    {statusInfo.text}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {overall.percentage?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Connection</p>
                  <div className="flex items-center space-x-2">
                    <connectionInfo.icon className={`w-5 h-5 ${connectionInfo.color}`} />
                    <p className={`text-lg font-semibold ${connectionInfo.color}`}>
                      {connectionInfo.text}
                    </p>
                  </div>
                </div>
                {lastConnectionError && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" title={lastConnectionError} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Controls</h3>
          <div className="flex flex-wrap gap-3">
            {/* Start/Resume Button */}
            <motion.button
              whileHover={{ scale: canStart ? 1.02 : 1 }}
              whileTap={{ scale: canStart ? 0.98 : 1 }}
              onClick={handleStart}
              disabled={!canStart}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                canStart
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <PlayIcon className="w-5 h-5" />
              <span>{isPaused ? 'Resume' : 'Start'}</span>
            </motion.button>

            {/* Pause Button */}
            <motion.button
              whileHover={{ scale: canPause ? 1.02 : 1 }}
              whileTap={{ scale: canPause ? 0.98 : 1 }}
              onClick={handlePause}
              disabled={!canPause}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                canPause
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <PauseIcon className="w-5 h-5" />
              <span>Pause</span>
            </motion.button>

            {/* Stop Button */}
            <motion.button
              whileHover={{ scale: canStop ? 1.02 : 1 }}
              whileTap={{ scale: canStop ? 0.98 : 1 }}
              onClick={handleStop}
              disabled={!canStop}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                canStop
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <StopIcon className="w-5 h-5" />
              <span>Stop</span>
            </motion.button>

            {/* Reset Button */}
            <motion.button
              whileHover={{ scale: canReset ? 1.02 : 1 }}
              whileTap={{ scale: canReset ? 0.98 : 1 }}
              onClick={handleReset}
              disabled={!canReset}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                canReset
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Reset</span>
            </motion.button>

            {/* Retry Failed Button */}
            {overall.failed > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRetryFailed}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>Retry Failed ({overall.failed})</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{overall.total || 0}</p>
              <p className="text-xs text-gray-500 uppercase">Total Files</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{overall.completed || 0}</p>
              <p className="text-xs text-gray-500 uppercase">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{overall.failed || 0}</p>
              <p className="text-xs text-gray-500 uppercase">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{overall.inProgress || 0}</p>
              <p className="text-xs text-gray-500 uppercase">In Progress</p>
            </div>
          </div>
        </div>

        {/* Warning Messages */}
        {lastConnectionError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Connection Error</p>
                <p className="text-sm text-red-700">{lastConnectionError}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      {showConfirmStop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Stop Migration?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to stop the migration? This will halt all current operations.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmStop}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Migration
              </button>
              <button
                onClick={() => setShowConfirmStop(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reset Migration?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reset the migration? This will clear all progress and logs.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmReset}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reset Migration
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel; 