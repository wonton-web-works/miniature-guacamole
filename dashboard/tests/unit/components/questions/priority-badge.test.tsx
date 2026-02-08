import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '@/components/questions/priority-badge';

describe('PriorityBadge', () => {
  it.each([
    ['critical', 'Critical'],
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
  ] as const)('renders %s priority label', (priority, label) => {
    render(<PriorityBadge priority={priority} />);
    expect(screen.getByTestId('priority-badge')).toHaveTextContent(label);
  });

  it('sets data-priority attribute', () => {
    render(<PriorityBadge priority="high" />);
    expect(screen.getByTestId('priority-badge')).toHaveAttribute('data-priority', 'high');
  });
});
