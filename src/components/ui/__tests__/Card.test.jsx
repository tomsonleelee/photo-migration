import React from 'react';
import { render, screen } from '@testing-library/react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card';

describe('Card Components', () => {
  describe('Card (Main Container)', () => {
    test('renders with default classes', () => {
      render(<Card data-testid="card">Card content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'p-4', 'shadow-md');
    });

    test('renders children correctly', () => {
      render(
        <Card>
          <div>Test content</div>
        </Card>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });

    test('forwards additional props', () => {
      render(
        <Card data-testid="card" role="region" aria-label="Test card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });
  });

  describe('CardHeader', () => {
    test('renders with correct classes', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('mb-4');
    });

    test('renders children correctly', () => {
      render(<CardHeader>Header text</CardHeader>);
      expect(screen.getByText('Header text')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    test('renders as h3 by default', () => {
      render(<CardTitle>Test Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Title');
    });

    test('renders with correct classes', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
    });

    test('applies custom className', () => {
      render(<CardTitle className="custom-title" data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    test('renders as paragraph', () => {
      render(<CardDescription>Test description</CardDescription>);
      const description = screen.getByText('Test description');
      expect(description.tagName).toBe('P');
    });

    test('renders with correct classes', () => {
      render(<CardDescription data-testid="description">Description</CardDescription>);
      const description = screen.getByTestId('description');
      expect(description).toHaveClass('text-sm', 'text-gray-600');
    });

    test('applies custom className', () => {
      render(<CardDescription className="custom-desc" data-testid="description">Desc</CardDescription>);
      const description = screen.getByTestId('description');
      expect(description).toHaveClass('custom-desc');
    });
  });

  describe('CardContent', () => {
    test('renders with correct classes', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      // CardContent doesn't have default classes
      expect(content).toBeTruthy();
    });

    test('renders children correctly', () => {
      render(
        <CardContent>
          <p>Content paragraph</p>
          <span>Content span</span>
        </CardContent>
      );
      expect(screen.getByText('Content paragraph')).toBeInTheDocument();
      expect(screen.getByText('Content span')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    test('renders with correct classes', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('mt-4', 'pt-4', 'border-t', 'border-gray-200');
    });

    test('renders children correctly', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Complete Card Structure', () => {
    test('renders a complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Complete Card Title</CardTitle>
            <CardDescription>This is a complete card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>
      );

      // Check that all parts are rendered
      expect(screen.getByTestId('complete-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Complete Card Title' })).toBeInTheDocument();
      expect(screen.getByText('This is a complete card description')).toBeInTheDocument();
      expect(screen.getByText('This is the main content of the card.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });

    test('works without header', () => {
      render(
        <Card>
          <CardContent>Content only</CardContent>
        </Card>
      );
      expect(screen.getByText('Content only')).toBeInTheDocument();
    });

    test('works without footer', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title Only</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    test('works with minimal structure', () => {
      render(
        <Card>
          <CardContent>Minimal card</CardContent>
        </Card>
      );
      expect(screen.getByText('Minimal card')).toBeInTheDocument();
    });

    test('maintains proper semantic structure', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle>Semantic Card</CardTitle>
            <CardDescription>Description text</CardDescription>
          </CardHeader>
          <CardContent data-testid="content">
            <p>Main content</p>
          </CardContent>
          <CardFooter data-testid="footer">
            <span>Footer info</span>
          </CardFooter>
        </Card>
      );

      const card = screen.getByTestId('card');
      const header = screen.getByTestId('header');
      const content = screen.getByTestId('content');
      const footer = screen.getByTestId('footer');

      expect(card).toContainElement(header);
      expect(card).toContainElement(content);
      expect(card).toContainElement(footer);
    });
  });

  describe('Accessibility', () => {
    test('supports ARIA attributes', () => {
      render(
        <Card role="article" aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      
      const title = screen.getByRole('heading');
      expect(title).toHaveAttribute('id', 'card-title');
    });

    test('title is properly associated with content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle id="card-title">Card Title</CardTitle>
            <CardDescription id="card-desc">Card Description</CardDescription>
          </CardHeader>
          <CardContent aria-labelledby="card-title" aria-describedby="card-desc" data-testid="content">
            Content
          </CardContent>
        </Card>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('aria-labelledby', 'card-title');
      expect(content).toHaveAttribute('aria-describedby', 'card-desc');
    });
  });

  describe('forwardRef Support', () => {
    test('forwards ref to main Card component', () => {
      const ref = React.createRef();
      render(<Card ref={ref}>Card with ref</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test('forwards ref to CardHeader', () => {
      const ref = React.createRef();
      render(<CardHeader ref={ref}>Header with ref</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test('forwards ref to CardTitle', () => {
      const ref = React.createRef();
      render(<CardTitle ref={ref}>Title with ref</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });
}); 