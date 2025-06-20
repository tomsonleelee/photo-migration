// 雙因子認證設定組件
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useTwoFactorAuth, 
  TFA_METHODS, 
  TFA_STATUS 
} from '../../utils/security/twoFactorAuth.js';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Card } from '../ui/Card.jsx';

export const TwoFactorSetup = ({ 
  userId, 
  isOpen, 
  onClose, 
  userInfo = {} 
}) => {
  const {
    tfaStatus,
    setupData,
    loading,
    enableTFA,
    verifySetup,
    disableTFA,
    regenerateBackupCodes
  } = useTwoFactorAuth(userId);

  const [selectedMethod, setSelectedMethod] = useState(TFA_METHODS.TOTP);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('method-selection'); // method-selection, setup, verification, backup-codes
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [error, setError] = useState('');

  // 開始設定 2FA
  const handleStartSetup = useCallback(async (method) => {
    try {
      setError('');
      setSelectedMethod(method);
      
      const result = await enableTFA(method, {
        email: userInfo.email,
        phoneNumber: userInfo.phoneNumber,
        userAgent: navigator.userAgent
      });
      
      setStep('setup');
    } catch (error) {
      setError(error.message);
    }
  }, [enableTFA, userInfo]);

  // 驗證設定
  const handleVerifySetup = useCallback(async () => {
    try {
      setError('');
      
      const result = await verifySetup(verificationCode);
      if (result.success) {
        setBackupCodes(result.backupCodes);
        setStep('backup-codes');
      }
    } catch (error) {
      setError(error.message);
    }
  }, [verifySetup, verificationCode]);

  // 禁用 2FA
  const handleDisable = useCallback(async () => {
    try {
      setError('');
      
      const result = await disableTFA(verificationCode, ''); // 密碼驗證需要實現
      if (result.success) {
        onClose();
      }
    } catch (error) {
      setError(error.message);
    }
  }, [disableTFA, verificationCode, onClose]);

  // 重新生成備用代碼
  const handleRegenerateBackupCodes = useCallback(async () => {
    try {
      setError('');
      
      const newCodes = await regenerateBackupCodes(verificationCode);
      setBackupCodes(newCodes);
      setShowBackupCodes(true);
    } catch (error) {
      setError(error.message);
    }
  }, [regenerateBackupCodes, verificationCode]);

  // 複製備用代碼
  const copyBackupCodes = useCallback(() => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  }, [backupCodes]);

  // 重置狀態
  const resetSetup = useCallback(() => {
    setStep('method-selection');
    setVerificationCode('');
    setError('');
    setBackupCodes([]);
    setShowBackupCodes(false);
  }, []);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="雙因子認證設定"
      size="large"
    >
      <div className="space-y-6">
        {/* 錯誤訊息 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-md p-4"
            >
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 當前狀態顯示 */}
        {tfaStatus && (
          <Card className="bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">
                  當前狀態: {tfaStatus.status === TFA_STATUS.ENABLED ? '已啟用' : '未啟用'}
                </h3>
                {tfaStatus.status === TFA_STATUS.ENABLED && (
                  <p className="text-sm text-blue-700">
                    方法: {tfaStatus.method} | 備用代碼: {tfaStatus.backupCodesCount} 個
                  </p>
                )}
              </div>
              {tfaStatus.status === TFA_STATUS.ENABLED && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('disable')}
                >
                  禁用 2FA
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* 方法選擇 */}
        {step === 'method-selection' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-medium">選擇雙因子認證方法</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TOTP 方法 */}
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleStartSetup(TFA_METHODS.TOTP)}
              >
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">📱</div>
                  <h4 className="font-medium mb-2">認證應用程式</h4>
                  <p className="text-sm text-gray-600">
                    使用 Google Authenticator 或 Authy 等應用程式
                  </p>
                </div>
              </Card>

              {/* SMS 方法 */}
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleStartSetup(TFA_METHODS.SMS)}
              >
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">📨</div>
                  <h4 className="font-medium mb-2">簡訊驗證</h4>
                  <p className="text-sm text-gray-600">
                    透過簡訊接收驗證碼
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* TOTP 設定 */}
        {step === 'setup' && selectedMethod === TFA_METHODS.TOTP && setupData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-medium">設定認證應用程式</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code */}
              <div className="text-center">
                <h4 className="font-medium mb-4">掃描 QR Code</h4>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img 
                    src={setupData.qrCode} 
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* 手動輸入 */}
              <div>
                <h4 className="font-medium mb-4">或手動輸入密鑰</h4>
                <div className="bg-gray-100 p-3 rounded-md mb-4">
                  <code className="text-sm break-all">
                    {setupData.manual_entry_key}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(setupData.manual_entry_key)}
                >
                  複製密鑰
                </Button>
              </div>
            </div>

            {/* 驗證碼輸入 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                輸入認證應用程式顯示的 6 位數驗證碼
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleVerifySetup}
                disabled={verificationCode.length !== 6 || loading}
                loading={loading}
              >
                驗證並啟用
              </Button>
              <Button
                variant="outline"
                onClick={resetSetup}
              >
                返回
              </Button>
            </div>
          </motion.div>
        )}

        {/* 備用代碼顯示 */}
        {step === 'backup-codes' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-green-900">
                雙因子認證已成功啟用！
              </h3>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-900 mb-2">
                重要：保存您的備用代碼
              </h4>
              <p className="text-sm text-yellow-700 mb-4">
                這些備用代碼可在您無法使用認證應用程式時使用。請將它們保存在安全的地方。
              </p>
              
              <div className="bg-white p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBackupCodes}
                >
                  複製代碼
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  列印代碼
                </Button>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full"
            >
              完成設定
            </Button>
          </motion.div>
        )}

        {/* 禁用 2FA */}
        {step === 'disable' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-red-900">
                禁用雙因子認證
              </h3>
              <p className="text-sm text-red-700">
                禁用後，您的帳戶安全性將會降低
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                請輸入驗證碼以確認禁用
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                maxLength={6}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={verificationCode.length !== 6 || loading}
                loading={loading}
              >
                確認禁用
              </Button>
              <Button
                variant="outline"
                onClick={resetSetup}
              >
                取消
              </Button>
            </div>
          </motion.div>
        )}

        {/* 管理備用代碼 */}
        {tfaStatus?.status === TFA_STATUS.ENABLED && step === 'method-selection' && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">備用代碼管理</h4>
                <p className="text-sm text-gray-600">
                  剩餘 {tfaStatus.backupCodesCount} 個備用代碼
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBackupCodes(true)}
              >
                重新生成代碼
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* 重新生成備用代碼 Modal */}
      <Modal
        isOpen={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        title="重新生成備用代碼"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            重新生成備用代碼會使所有現有的備用代碼失效。
          </p>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              請輸入驗證碼以確認
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
            />
          </div>

          {backupCodes.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium mb-2">新的備用代碼：</h5>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white rounded text-center">
                    {code}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={copyBackupCodes}
              >
                複製代碼
              </Button>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={handleRegenerateBackupCodes}
              disabled={verificationCode.length !== 6 || loading}
              loading={loading}
            >
              重新生成
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBackupCodes(false)}
            >
              取消
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

export default TwoFactorSetup;