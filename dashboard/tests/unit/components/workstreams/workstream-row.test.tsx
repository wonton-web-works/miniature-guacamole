import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkstreamRow } from '@/components/workstreams/workstream-row';
import type { WorkstreamSummary } from '@/lib/types';

// Must wrap in table structure for valid HTML
function renderInTable(ui: React.ReactElement) {
  return render(<table><tbody>{ui}</tbody></table>);
}

const makeWs = (overrides: Partial<WorkstreamSummary> = {}): WorkstreamSummary => ({
  workstream_id: 'ws-test',
  name: 'Test WS',
  status: 'in_progress',
  phase: 'planning',
  agent_id: 'dev-agent',
  timestamp: new Date().toISOString(),
  created_at: '2025-01-01',
  ...overrides,
});

describe('WorkstreamRow', () => {
  it('renders workstream name', () => {
    renderInTable(<WorkstreamRow workstream={makeWs()} onClick={vi.fn()} />);
    expect(screen.getByText('Test WS')).toBeInTheDocument();
  });

  it('renders agent id', () => {
    renderInTable(<WorkstreamRow workstream={makeWs()} onClick={vi.fn()} />);
    expect(screen.getByText('dev-agent')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderInTable(<WorkstreamRow workstream={makeWs()} onClick={vi.fn()} />);
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
  });

  it('renders phase badge', () => {
    renderInTable(<WorkstreamRow workstream={makeWs()} onClick={vi.fn()} />);
    expect(screen.getByTestId('phase-badge')).toBeInTheDocument();
  });

  it('calls onClick with workstream id', () => {
    const onClick = vi.fn();
    renderInTable(<WorkstreamRow workstream={makeWs()} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('workstream-row-ws-test'));
    expect(onClick).toHaveBeenCalledWith('ws-test');
  });

  it('has data-testid with workstream id', () => {
    renderInTable(<WorkstreamRow workstream={makeWs()} onClick={vi.fn()} />);
    expect(screen.getByTestId('workstream-row-ws-test')).toBeInTheDocument();
  });
});
