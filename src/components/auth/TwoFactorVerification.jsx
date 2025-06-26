// 雙因子認證驗證組件
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyTwoFactor, TFA_METHODS } from '../../utils/security/twoFactorAuth.js';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';

export const TwoFactorVerification = ({
  userId,
  tfaMethod,
  onSuccess,
  onError,
  onCancel,
  className = ''
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 倒數計時器
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // 自動提交（當輸入滿6位數時）
  useEffect(() => {
    if (verificationCode.length === 6 && !useBackupCode) {
      handleVerify();
    } else if (verificationCode.length === 8 && useBackupCode) {
      handleVerify();
    }
  }, [verificationCode, useBackupCode]);

  // 驗證代碼
  const handleVerify = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError('');

      const method = useBackupCode ? TFA_METHODS.BACKUP_CODES : tfaMethod;
      const result = await verifyTwoFactor(userId, verificationCode, method);

      if (result.success) {
        onSuccess?.(result);
      }
    } catch (error) {
      setError(error.message);
      onError?.(error);
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  }, [userId, verificationCode, tfaMethod, useBackupCode, loading, onSuccess, onError]);

  // 重新發送驗證碼（SMS/Email）
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;

    try {
      // 這裡需要調用重新發送API
      // await resendVerificationCode(userId, tfaMethod);
      setResendCooldown(60); // 60秒冷卻時間
    } catch (error) {
      setError('重新發送失敗，請稍後再試');
    }
  }, [userId, tfaMethod, resendCooldown]);

  // 切換備用代碼模式
  const toggleBackupCode = useCallback(() => {
    setUseBackupCode(prev => !prev);
    setVerificationCode('');
    setError('');
  }, []);

  // 獲取輸入框配置
  const getInputConfig = () => {
    if (useBackupCode) {
      return {
        placeholder: '12345678',
        maxLength: 8,
        pattern: '[0-9]{8}',
        title: '請輸入8位數備用代碼'
      };
    }

    switch (tfaMethod) {
      case TFA_METHODS.TOTP:
        return {
          placeholder: '123456',
          maxLength: 6,
          pattern: '[0-9]{6}',
          title: '請輸入6位數認證代碼'
        };
      case TFA_METHODS.SMS:
      case TFA_METHODS.EMAIL:
        return {
          placeholder: '123456',
          maxLength: 6,
          pattern: '[0-9]{6}',
          title: '請輸入6位數驗證碼'
        };
      default:
        return {
          placeholder: '123456',
          maxLength: 6,
          pattern: '[0-9]{6}',
          title: '請輸入驗證碼'
        };
    }
  };

  // 獲取方法名稱
  const getMethodName = () => {
    if (useBackupCode) return '備用代碼';
    
    switch (tfaMethod) {
      case TFA_METHODS.TOTP:
        return '認證應用程式';
      case TFA_METHODS.SMS:
        return '簡訊';
      case TFA_METHODS.EMAIL:
        return '電子郵件';
      default:
        return '雙因子認證';
    }
  };

  // 獲取說明文字
  const getInstructions = () => {
    if (useBackupCode) {
      return '請輸入您保存的8位數備用代碼';
    }

    switch (tfaMethod) {
      case TFA_METHODS.TOTP:
        return '請打開您的認證應用程式（如 Google Authenticator），輸入顯示的6位數代碼';
      case TFA_METHODS.SMS:
        return '我們已發送6位數驗證碼到您的手機，請查看簡訊';
      case TFA_METHODS.EMAIL:
        return '我們已發送6位數驗證碼到您的電子郵件，請查看信箱';
      default:
        return '請輸入您的雙因子認證代碼';
    }
  };

  const inputConfig = getInputConfig();

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <Card className="p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">
            {useBackupCode ? '🔑' : '🔐'}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {getMethodName()}驗證
          </h2>
          <p className="text-sm text-gray-600">
            {getInstructions()}
          </p>
        </div>

        {/* 錯誤訊息 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-md p-3 mb-4"
            >
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 驗證碼輸入 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            驗證碼
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // 只允許數字
              setVerificationCode(value);
              setError('');
            }}
            placeholder={inputConfig.placeholder}
            maxLength={inputConfig.maxLength}
            pattern={inputConfig.pattern}
            title={inputConfig.title}
            className="w-full px-4 py-3 text-center text-lg font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="one-time-code"
            autoFocus
          />
          
          {/* 輸入進度指示器 */}
          <div className="flex justify-center mt-2 space-x-1">
            {Array.from({ length: inputConfig.maxLength }).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index < verificationCode.length
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 動作按鈕 */}
        <div className="space-y-3">
          <Button
            onClick={handleVerify}
            disabled={
              verificationCode.length !== inputConfig.maxLength || loading
            }
            loading={loading}
            className="w-full"
          >
            驗證
          </Button>

          {/* 重新發送按鈕（SMS/Email） */}
          {(tfaMethod === TFA_METHODS.SMS || tfaMethod === TFA_METHODS.EMAIL) && 
           !useBackupCode && (
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full"
            >
              {resendCooldown > 0 
                ? `重新發送 (${resendCooldown}s)`
                : '重新發送驗證碼'
              }
            </Button>
          )}

          {/* 切換備用代碼 */}
          <Button
            variant="ghost"
            onClick={toggleBackupCode}
            className="w-full text-sm"
          >
            {useBackupCode 
              ? '使用認證應用程式'
              : '使用備用代碼'
            }
          </Button>

          {/* 取消按鈕 */}
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full text-sm text-gray-500"
          >
            取消登入
          </Button>
        </div>

        {/* 幫助資訊 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer font-medium mb-2">
              需要幫助？
            </summary>
            <div className="space-y-2">
              {!useBackupCode && (
                <>
                  <p>• 確保您的設備時間正確</p>
                  <p>• 如果代碼不正確，請等待下一個代碼生成</p>
                  <p>• 無法存取認證應用程式？請使用備用代碼</p>
                </>
              )}
              {useBackupCode && (
                <>
                  <p>• 備用代碼只能使用一次</p>
                  <p>• 請確保輸入完整的8位數代碼</p>
                  <p>• 用完備用代碼後，請重新生成新的代碼</p>
                </>
              )}
            </div>
          </details>
        </div>
      </Card>
    </div>
  );
};

// 簡化版本的 2FA 驗證組件（用於快速驗證）
export const QuickTwoFactorVerification = ({
  userId,
  tfaMethod,
  onSuccess,
  onError,
  placeholder = "輸入驗證碼"
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    try {
      setLoading(true);
      const result = await verifyTwoFactor(userId, code, tfaMethod);
      onSuccess?.(result);
    } catch (error) {
      onError?.(error);
    } finally {
      setLoading(false);
      setCode('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        maxLength={6}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
      />
      <Button
        type="submit"
        disabled={code.length !== 6 || loading}
        loading={loading}
      >
        驗證
      </Button>
    </form>
  );
};

export default TwoFactorVerification;