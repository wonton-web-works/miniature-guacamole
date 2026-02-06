import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionHealth } from '@/components/shared/connection-health';

describe('ConnectionHealth', () => {
  it('renders connected status correctly', () => {
    render(<ConnectionHealth status="connected" />);
    const health = screen.getByTestId('connection-health');
    expect(health).toBeInTheDocument();
    expect(health).toHaveAttribute('data-status', 'connected');
    expect(health).toHaveAttribute('aria-label', 'Connection status: Connected');
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders reconnecting status correctly', () => {
    render(<ConnectionHealth status="reconnecting" />);
    const health = screen.getByTestId('connection-health');
    expect(health).toHaveAttribute('data-status', 'reconnecting');
    expect(health).toHaveAttribute('aria-label', 'Connection status: Reconnecting');
    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
  });

  it('renders disconnected status correctly', () => {
    render(<ConnectionHealth status="disconnected" />);
    const health = screen.getByTestId('connection-health');
    expect(health).toHaveAttribute('data-status', 'disconnected');
    expect(health).toHaveAttribute('aria-label', 'Connection status: Disconnected');
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('applies correct color class for connected', () => {
    const { container } = render(<ConnectionHealth status="connected" />);
    const indicator = container.querySelector('.bg-green-500');
    expect(indicator).toBeInTheDocument();
  });

  it('applies correct color class for reconnecting', () => {
    const { container } = render(<ConnectionHealth status="reconnecting" />);
    const indicator = container.querySelector('.bg-amber-500');
    expect(indicator).toBeInTheDocument();
  });

  it('applies correct color class for disconnected', () => {
    const { container } = render(<ConnectionHealth status="disconnected" />);
    const indicator = container.querySelector('.bg-red-500');
    expect(indicator).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ConnectionHealth status="connected" className="custom-health-class" />);
    const health = screen.getByTestId('connection-health');
    expect(health).toHaveClass('custom-health-class');
  });

  it('has role="status" for accessibility', () => {
    render(<ConnectionHealth status="connected" />);
    const health = screen.getByRole('status');
    expect(health).toBeInTheDocument();
  });
});
