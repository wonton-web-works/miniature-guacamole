import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Filters } from '@/components/workstreams/filters';

const defaultProps = {
  search: '',
  onSearchChange: vi.fn(),
  statusFilter: '' as const,
  onStatusChange: vi.fn(),
  phaseFilter: '',
  onPhaseChange: vi.fn(),
  phases: ['planning', 'step_1_test_spec', 'complete'],
  onClear: vi.fn(),
};

describe('Filters', () => {
  it('renders search input', () => {
    render(<Filters {...defaultProps} />);
    expect(screen.getByTestId('filter-search')).toBeInTheDocument();
  });

  it('renders status select', () => {
    render(<Filters {...defaultProps} />);
    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
  });

  it('renders phase select with available phases', () => {
    render(<Filters {...defaultProps} />);
    const select = screen.getByTestId('filter-phase');
    expect(select).toBeInTheDocument();
    expect(select).toContainHTML('Planning');
  });

  it('calls onSearchChange on input', () => {
    const onSearchChange = vi.fn();
    render(<Filters {...defaultProps} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByTestId('filter-search'), { target: { value: 'test' } });
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });

  it('calls onStatusChange on select', () => {
    const onStatusChange = vi.fn();
    render(<Filters {...defaultProps} onStatusChange={onStatusChange} />);
    fireEvent.change(screen.getByTestId('filter-status'), { target: { value: 'blocked' } });
    expect(onStatusChange).toHaveBeenCalledWith('blocked');
  });

  it('shows clear button when filters are active', () => {
    render(<Filters {...defaultProps} search="test" />);
    expect(screen.getByTestId('filter-clear')).toBeInTheDocument();
  });

  it('hides clear button when no filters active', () => {
    render(<Filters {...defaultProps} />);
    expect(screen.queryByTestId('filter-clear')).not.toBeInTheDocument();
  });

  it('calls onClear when clear clicked', () => {
    const onClear = vi.fn();
    render(<Filters {...defaultProps} search="test" onClear={onClear} />);
    fireEvent.click(screen.getByTestId('filter-clear'));
    expect(onClear).toHaveBeenCalled();
  });
});
