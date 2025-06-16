import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Modal content')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders title when provided', () => {
      render(<Modal {...defaultProps} title="Test Modal Title" />);
      expect(screen.getByRole('heading', { name: 'Test Modal Title' })).toBeInTheDocument();
    });

    test('renders without title', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<Modal {...defaultProps} className="custom-modal" />);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('custom-modal');
    });
  });

  describe('Size Variants', () => {
    test('renders small size correctly', () => {
      render(<Modal {...defaultProps} size="sm" />);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-md');
    });

    test('renders medium size correctly (default)', () => {
      render(<Modal {...defaultProps} size="md" />);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-lg');
    });

    test('renders large size correctly', () => {
      render(<Modal {...defaultProps} size="lg" />);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-2xl');
    });

    test('renders extra large size correctly', () => {
      render(<Modal {...defaultProps} size="xl" />);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-4xl');
    });

    test('renders full size correctly', () => {
      render(<Modal {...defaultProps} size="full" />);
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-full');
    });
  });

  describe('Close Functionality', () => {
    test('shows close button by default', () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /關閉/i });
      expect(closeButton).toBeInTheDocument();
    });

    test('hides close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      const closeButton = screen.queryByRole('button', { name: /關閉/i });
      expect(closeButton).not.toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /關閉/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when overlay is clicked by default', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);
      
      const overlay = screen.getByTestId('modal-overlay');
      await user.click(overlay);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    test('does not call onClose when overlay is clicked if closeOnOverlayClick is false', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} closeOnOverlayClick={false} />);
      
      const overlay = screen.getByTestId('modal-overlay');
      await user.click(overlay);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    test('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);
      
      const modalContent = screen.getByText('Modal content');
      await user.click(modalContent);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    test('calls onClose when Escape key is pressed by default', () => {
      render(<Modal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    test('does not call onClose when Escape key is pressed if closeOnEscape is false', () => {
      render(<Modal {...defaultProps} closeOnEscape={false} />);
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    test('does not call onClose when other keys are pressed', () => {
      render(<Modal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space', code: 'Space' });
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('has correct ARIA attributes', () => {
      render(<Modal {...defaultProps} title="Test Modal" />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      
      const title = screen.getByRole('heading');
      expect(title).toHaveAttribute('id');
      expect(modal.getAttribute('aria-labelledby')).toBe(title.getAttribute('id'));
    });

    test('has aria-describedby when description is provided', () => {
      render(
        <Modal {...defaultProps} title="Test Modal" aria-describedby="modal-description">
          <p id="modal-description">This is a description</p>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-describedby', 'modal-description');
    });

    test('focuses on modal when opened', async () => {
      render(<Modal {...defaultProps} />);
      
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();
      });
    });

    test('manages focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <input data-testid="first-input" />
          <button>Button</button>
          <input data-testid="last-input" />
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      const firstInput = screen.getByTestId('first-input');
      const closeButton = screen.getByRole('button', { name: '關閉' });
      
      // Modal should have focus initially
      expect(modal).toHaveFocus();
      
      // Tab should move through focusable elements in DOM order
      await user.tab();
      expect(closeButton).toHaveFocus(); // Close button is first in the header
      
      await user.tab();
      expect(firstInput).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Button' })).toHaveFocus();
    });
  });

  describe('Confirmation Modal', () => {
    const confirmProps = {
      isOpen: true,
      onClose: jest.fn(),
      title: 'Confirm Action',
      type: 'confirm',
      confirmText: '確認',
      cancelText: '取消',
      onConfirm: jest.fn(),
      children: 'Are you sure?'
    };

    test('renders confirmation buttons', () => {
      render(<Modal {...confirmProps} />);
      
      expect(screen.getByRole('button', { name: '確認' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    });

    test('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...confirmProps} />);
      
      const confirmButton = screen.getByRole('button', { name: '確認' });
      await user.click(confirmButton);
      
      expect(confirmProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...confirmProps} />);
      
      const cancelButton = screen.getByRole('button', { name: '取消' });
      await user.click(cancelButton);
      
      expect(confirmProps.onClose).toHaveBeenCalledTimes(1);
    });

    test('shows loading state on confirm button', () => {
      render(<Modal {...confirmProps} confirmLoading={true} />);
      
      const confirmButton = screen.getByRole('button', { name: '載入中...' });
      expect(confirmButton).toBeDisabled();
      expect(confirmButton).toHaveClass('disabled:opacity-50');
    });

    test('uses custom button texts', () => {
      render(
        <Modal 
          {...confirmProps} 
          confirmText="Delete" 
          cancelText="Keep" 
        />
      );
      
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    });
  });

  describe('Integration and Edge Cases', () => {
    test('handles rapid open/close toggles', async () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);
      
      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      
      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('cleans up event listeners when unmounted', () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      
      unmount();
      
      // Should not throw errors when pressing Escape after unmount
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    test('handles complex content structure', () => {
      render(
        <Modal {...defaultProps} title="Complex Modal">
          <div>
            <h3>Section Title</h3>
            <form>
              <input type="text" placeholder="Name" />
              <textarea placeholder="Description"></textarea>
              <select>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
              <button type="submit">Submit</button>
            </form>
          </div>
        </Modal>
      );

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    test('maintains scroll position and prevents body scroll', () => {
      const originalStyle = document.body.style.overflow;
      
      render(<Modal {...defaultProps} />);
      
      // Modal should prevent body scroll
      expect(document.body.style.overflow).toBe('hidden');
      
      // Cleanup should restore original overflow
      const { unmount } = render(<Modal {...defaultProps} />);
      unmount();
      
      expect(document.body.style.overflow).toBe(originalStyle);
    });
  });
}); 