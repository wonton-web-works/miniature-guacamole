import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'conditional', false && 'excluded')).toBe('base conditional');
  });

  it('handles undefined values', () => {
    expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
  });

  it('handles null values', () => {
    expect(cn('class1', null, 'class2')).toBe('class1 class2');
  });

  it('handles array of classes', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('handles object notation', () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3');
  });

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles complex combinations', () => {
    const result = cn(
      'base-class',
      { dynamic: true, excluded: false },
      undefined,
      null,
      'additional-class',
      ['array-class-1', 'array-class-2']
    );
    expect(result).toBe('base-class dynamic additional-class array-class-1 array-class-2');
  });

  it('resolves conflicting Tailwind classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
