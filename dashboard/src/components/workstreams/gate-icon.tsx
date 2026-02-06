import { CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GateIconProps {
  gateStatus?: string;
  className?: string;
}

export function GateIcon({ gateStatus, className }: GateIconProps) {
  if (!gateStatus) return null;

  const passed = gateStatus === 'passed' || gateStatus === 'approved';

  return passed ? (
    <CheckCircle
      className={cn('h-4 w-4 text-status-complete', className)}
      data-testid="gate-icon-passed"
      aria-label="Gate passed"
    />
  ) : (
    <AlertTriangle
      className={cn('h-4 w-4 text-status-ready-for-review', className)}
      data-testid="gate-icon-pending"
      aria-label="Gate pending"
    />
  );
}
