import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionResponse } from '@/components/questions/question-response';

describe('QuestionResponse', () => {
  it('renders textarea', () => {
    render(<QuestionResponse questionId="q-1" onSubmit={vi.fn()} isSubmitting={false} />);
    expect(screen.getByTestId('response-textarea')).toBeInTheDocument();
  });

  it('renders approve, reject, respond buttons', () => {
    render(<QuestionResponse questionId="q-1" onSubmit={vi.fn()} isSubmitting={false} />);
    expect(screen.getByTestId('action-approve')).toBeInTheDocument();
    expect(screen.getByTestId('action-reject')).toBeInTheDocument();
    expect(screen.getByTestId('action-respond')).toBeInTheDocument();
  });

  it('respond button disabled when textarea empty', () => {
    render(<QuestionResponse questionId="q-1" onSubmit={vi.fn()} isSubmitting={false} />);
    expect(screen.getByTestId('action-respond')).toBeDisabled();
  });

  it('respond button enabled when textarea has text', () => {
    render(<QuestionResponse questionId="q-1" onSubmit={vi.fn()} isSubmitting={false} />);
    fireEvent.change(screen.getByTestId('response-textarea'), { target: { value: 'Yes' } });
    expect(screen.getByTestId('action-respond')).not.toBeDisabled();
  });

  it('calls onSubmit with correct args on approve', () => {
    const onSubmit = vi.fn();
    render(<QuestionResponse questionId="q-1" onSubmit={onSubmit} isSubmitting={false} />);
    fireEvent.click(screen.getByTestId('action-approve'));
    expect(onSubmit).toHaveBeenCalledWith('q-1', '', 'approve');
  });

  it('calls onSubmit with answer text on respond', () => {
    const onSubmit = vi.fn();
    render(<QuestionResponse questionId="q-1" onSubmit={onSubmit} isSubmitting={false} />);
    fireEvent.change(screen.getByTestId('response-textarea'), { target: { value: 'My answer' } });
    fireEvent.click(screen.getByTestId('action-respond'));
    expect(onSubmit).toHaveBeenCalledWith('q-1', 'My answer', 'respond');
  });

  it('disables all buttons when submitting', () => {
    render(<QuestionResponse questionId="q-1" onSubmit={vi.fn()} isSubmitting={true} />);
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('action-reject')).toBeDisabled();
  });
});
