import { FileText } from 'lucide-react';

interface RelatedFilesProps {
  dependencies?: string[];
}

export function RelatedFiles({ dependencies }: RelatedFilesProps) {
  if (!dependencies || dependencies.length === 0) return null;

  return (
    <div data-testid="related-files">
      <h3 className="text-sm font-medium">Dependencies</h3>
      <ul className="mt-2 space-y-1">
        {dependencies.map((dep, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono text-xs">{dep}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
