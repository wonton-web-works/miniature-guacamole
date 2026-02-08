import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentItem } from '@/components/sidebar/agent-item';

describe('AgentItem', () => {
  it('renders agent name', () => {
    render(<AgentItem agentId="dev-agent" isActive={true} lastSeen={new Date().toISOString()} />);
    expect(screen.getByText('dev-agent')).toBeInTheDocument();
  });

  it('renders active dot for active agent', () => {
    const { container } = render(
      <AgentItem agentId="dev-agent" isActive={true} lastSeen={new Date().toISOString()} />
    );
    expect(container.querySelector('.bg-status-complete')).toBeInTheDocument();
  });

  it('renders inactive dot for idle agent', () => {
    const { container } = render(
      <AgentItem agentId="dev-agent" isActive={false} lastSeen={new Date().toISOString()} />
    );
    expect(container.querySelector('.bg-muted')).toBeInTheDocument();
  });

  it('has data-testid', () => {
    render(<AgentItem agentId="dev-agent" isActive={true} lastSeen={new Date().toISOString()} />);
    expect(screen.getByTestId('agent-item-dev-agent')).toBeInTheDocument();
  });
});
