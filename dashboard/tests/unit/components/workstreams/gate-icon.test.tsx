import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GateIcon } from '@/components/workstreams/gate-icon';

describe('GateIcon', () => {
  it('renders null when no gateStatus', () => {
    const { container } = render(<GateIcon />);
    expect(container.firstChild).toBeNull();
  });

  it('renders check icon for passed status', () => {
    render(<GateIcon gateStatus="passed" />);
    expect(screen.getByTestId('gate-icon-passed')).toBeInTheDocument();
  });

  it('renders check icon for approved status', () => {
    render(<GateIcon gateStatus="approved" />);
    expect(screen.getByTestId('gate-icon-passed')).toBeInTheDocument();
  });

  it('renders alert icon for pending status', () => {
    render(<GateIcon gateStatus="pending" />);
    expect(screen.getByTestId('gate-icon-pending')).toBeInTheDocument();
  });

  it('renders alert icon for unknown status', () => {
    render(<GateIcon gateStatus="review" />);
    expect(screen.getByTestId('gate-icon-pending')).toBeInTheDocument();
  });
});
