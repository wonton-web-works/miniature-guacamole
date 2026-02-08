import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/header';

describe('Header', () => {
  it('renders app title', () => {
    render(<Header connectionStatus="connected" />);
    expect(screen.getByText('Agent-C')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders with data-testid', () => {
    render(<Header connectionStatus="connected" />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders connection health indicator', () => {
    render(<Header connectionStatus="connected" />);
    expect(screen.getByTestId('connection-health')).toBeInTheDocument();
  });

  it('passes connection status to ConnectionHealth', () => {
    render(<Header connectionStatus="disconnected" />);
    expect(screen.getByTestId('connection-health')).toHaveAttribute('data-status', 'disconnected');
  });
});
