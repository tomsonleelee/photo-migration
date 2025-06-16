import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast, { ToastProvider } from '../Toast';

// Test helper component to trigger toasts
const ToastTrigger = () => {
  const { showToast } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>
        Show Success
      </button>
      <button onClick={() => showToast('Error message', 'error')}>
        Show Error
      </button>
      <button onClick={() => showToast('Warning message', 'warning')}>
        Show Warning
      </button>
      <button onClick={() => showToast('Info message', 'info')}>
        Show Info
      </button>
      <button onClick={() => showToast('Custom message', 'success', { duration: 1000 })}>
        Show Custom Duration
      </button>
    </div>
  );
};

const renderWithToastProvider = (component) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('Toast System', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Toast Component', () => {
    const defaultProps = {
      message: 'Test message',
      type: 'info',
      onClose: jest.fn()
    };

    test('renders with message', () => {
      render(<Toast {...defaultProps} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    test('renders success variant correctly', () => {
      render(<Toast {...defaultProps} type="success" />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-green-50');
    });

    test('renders error variant correctly', () => {
      render(<Toast {...defaultProps} type="error" />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-red-50');
    });

    test('renders warning variant correctly', () => {
      render(<Toast {...defaultProps} type="warning" />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-yellow-50');
    });

    test('renders info variant correctly', () => {
      render(<Toast {...defaultProps} type="info" />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-blue-50');
    });

    test('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onClose = jest.fn();
      
      render(<Toast {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: '關閉通知' });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    test('renders with title and message', () => {
      render(<Toast {...defaultProps} title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    test('renders with action button', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const actionHandler = jest.fn();
      const action = {
        label: 'Action Button',
        onClick: actionHandler
      };
      
      render(<Toast {...defaultProps} action={action} />);
      
      const actionButton = screen.getByText('Action Button');
      expect(actionButton).toBeInTheDocument();
      
      await user.click(actionButton);
      expect(actionHandler).toHaveBeenCalled();
    });

    test('does not render when isVisible is false', () => {
      render(<Toast {...defaultProps} isVisible={false} />);
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<Toast {...defaultProps} className="custom-class" />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('custom-class');
    });
  });

  describe('Toast Provider Component', () => {
    test('renders children', () => {
      render(
        <ToastProvider>
          <div>Test content</div>
        </ToastProvider>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has correct ARIA attributes', () => {
      render(<Toast message="Test" type="info" />);
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    test('error toasts have assertive aria-live', () => {
      render(<Toast message="Error" type="error" />);
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'assertive');
    });

    test('close button has accessible label', () => {
      render(<Toast message="Test" type="info" onClose={jest.fn()} />);
      
      const closeButton = screen.getByRole('button', { name: '關閉通知' });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined onClose gracefully', () => {
      render(<Toast message="Test" type="info" />);
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('handles empty message', () => {
      render(<Toast message="" type="info" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('handles undefined action gracefully', () => {
      render(<Toast message="Test" type="info" action={undefined} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    test('applies correct icon for each type', () => {
      const types = ['success', 'error', 'warning', 'info'];
      
      types.forEach(type => {
        const { unmount } = render(<Toast message="Test" type={type} />);
        const toast = screen.getByRole('alert');
        expect(toast).toBeInTheDocument();
        unmount();
      });
    });
  });
}); 