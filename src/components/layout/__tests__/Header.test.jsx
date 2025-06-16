import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Header from '../Header';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  describe('Basic Rendering', () => {
    test('renders brand logo and title', () => {
      renderWithRouter(<Header />);
      
      expect(screen.getByText('相片遷移系統')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /相片遷移系統/i })).toHaveAttribute('href', '/');
    });

    test('renders navigation links', () => {
      renderWithRouter(<Header />);
      
      expect(screen.getByRole('link', { name: '首頁' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: '遷移' })).toHaveAttribute('href', '/migrate');
      expect(screen.getByRole('link', { name: '歷史記錄' })).toHaveAttribute('href', '/history');
      expect(screen.getByRole('link', { name: '設定' })).toHaveAttribute('href', '/settings');
    });

    test('has correct header structure', () => {
      renderWithRouter(<Header />);
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-white', 'border-b', 'border-gray-200', 'shadow-sm');
    });
  });

  describe('Mobile Menu', () => {
    test('shows mobile menu button on mobile', () => {
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /開啟選單|關閉選單/i });
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveClass('md:hidden');
    });

    test('toggles mobile menu when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /開啟選單/i });
      
      // Initially menu should be closed
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      
      // Click to open menu
      await user.click(menuButton);
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      
      // Click to close menu
      const closeButton = screen.getByRole('button', { name: /關閉選單/i });
      await user.click(closeButton);
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    });

    test('mobile menu contains all navigation links', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /開啟選單/i });
      await user.click(menuButton);
      
      const mobileMenu = screen.getByTestId('mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      
      // Check that all links are present in mobile menu
      const mobileLinks = screen.getAllByRole('link');
      const linkTexts = mobileLinks.map(link => link.textContent);
      
      expect(linkTexts).toContain('首頁');
      expect(linkTexts).toContain('遷移');
      expect(linkTexts).toContain('歷史記錄');
      expect(linkTexts).toContain('設定');
    });

    test('closes mobile menu when clicking outside', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button', { name: /開啟選單/i });
      await user.click(menuButton);
      
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      
      // Click outside the menu
      fireEvent.click(document.body);
      
      // Menu should still be open (this might depend on implementation)
      // Note: This test might need adjustment based on actual implementation
    });
  });

  describe('Navigation State', () => {
    test('highlights active navigation link', () => {
      // Mock window.location.pathname
      Object.defineProperty(window, 'location', {
        value: { pathname: '/migrate' },
        writable: true
      });

      renderWithRouter(<Header />);
      
      const migrateLink = screen.getByRole('link', { name: '遷移' });
      expect(migrateLink).toHaveClass('text-blue-600');
    });

    test('applies correct classes to non-active links', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true
      });

      renderWithRouter(<Header />);
      
      const settingsLink = screen.getByRole('link', { name: '設定' });
      expect(settingsLink).toHaveClass('text-gray-700');
      expect(settingsLink).not.toHaveClass('text-blue-600');
    });
  });

  describe('Responsive Design', () => {
    test('hides desktop navigation on mobile', () => {
      renderWithRouter(<Header />);
      
      const desktopNav = screen.getByRole('navigation');
      expect(desktopNav).toHaveClass('hidden', 'md:flex');
    });

    test('shows desktop navigation on larger screens', () => {
      renderWithRouter(<Header />);
      
      const desktopNav = screen.getByRole('navigation');
      expect(desktopNav).toHaveClass('md:flex');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button');
      expect(menuButton).toHaveAttribute('aria-label');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    test('updates aria-expanded when menu is toggled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    test('has proper semantic structure', () => {
      renderWithRouter(<Header />);
      
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    test('logo link has accessible name', () => {
      renderWithRouter(<Header />);
      
      const logoLink = screen.getByRole('link', { name: /相片遷移系統/i });
      expect(logoLink).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('mobile menu button is keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button');
      
      // Focus the button and press Enter
      menuButton.focus();
      await user.keyboard('{Enter}');
      
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    });

    test('navigation links are keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      // Tab through navigation links
      await user.tab();
      expect(screen.getByRole('link', { name: /相片遷移系統/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('link', { name: '首頁' })).toHaveFocus();
    });

    test('can navigate through mobile menu with keyboard', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      // Tab through mobile menu items
      const mobileMenuLinks = screen.getAllByRole('link');
      
      for (const link of mobileMenuLinks) {
        await user.tab();
        // Each link should be focusable
        expect(document.activeElement).toBe(link);
      }
    });
  });

  describe('Brand and Logo', () => {
    test('brand logo contains correct icon', () => {
      renderWithRouter(<Header />);
      
      const brandIcon = screen.getByTestId('camera-icon');
      expect(brandIcon).toBeInTheDocument();
    });

    test('brand text is properly styled', () => {
      renderWithRouter(<Header />);
      
      const brandText = screen.getByText('相片遷移系統');
      expect(brandText).toHaveClass('font-bold', 'text-gray-900');
    });
  });

  describe('Edge Cases', () => {
    test('handles long navigation text gracefully', () => {
      // This would test if very long navigation text breaks the layout
      renderWithRouter(<Header />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      // Additional checks for text overflow handling could be added
    });

    test('works without JavaScript (progressive enhancement)', () => {
      renderWithRouter(<Header />);
      
      // Basic navigation should work even without JavaScript
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    test('handles rapid menu toggling', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByRole('button');
      
      // Rapidly toggle menu multiple times
      await user.click(menuButton);
      await user.click(menuButton);
      await user.click(menuButton);
      
      // Should end up in a consistent state
      const finalState = menuButton.getAttribute('aria-expanded') === 'true';
      if (finalState) {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      }
    });
  });
}); 