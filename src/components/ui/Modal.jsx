import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  type = 'default',
  onConfirm,
  confirmText = '確認',
  cancelText = '取消',
  confirmLoading = false,
  ...props
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // 設置焦點到模態框
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleOverlayClick}
        data-testid="modal-overlay"
      >
        {/* 背景遮罩 */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
        
        {/* Modal 內容 */}
        <div 
          ref={modalRef}
          className={`inline-block w-full ${sizes[size]} my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          tabIndex={-1}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {title && (
                <h3 id="modal-title" className="text-lg font-medium text-gray-900">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="關閉"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
          
          {/* Confirmation Footer */}
          {type === 'confirm' && (
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" onClick={onClose}>
                {cancelText}
              </Button>
              <Button 
                variant="danger" 
                onClick={onConfirm}
                loading={confirmLoading}
                disabled={confirmLoading}
              >
                {confirmText}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal 子組件
const ModalHeader = ({ children, className = '', ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

const ModalBody = ({ children, className = '', ...props }) => (
  <div className={`mb-6 ${className}`} {...props}>
    {children}
  </div>
);

const ModalFooter = ({ children, className = '', ...props }) => (
  <div className={`flex justify-end space-x-3 pt-4 border-t border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

// 確認對話框
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '確認操作',
  message,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'danger',
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <ModalBody>
      <p className="text-gray-600">{message}</p>
    </ModalBody>
    <ModalFooter>
      <Button variant="outline" onClick={onClose}>
        {cancelText}
      </Button>
      <Button variant={variant} onClick={onConfirm}>
        {confirmText}
      </Button>
    </ModalFooter>
  </Modal>
);

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.Confirm = ConfirmModal;

export default Modal; 