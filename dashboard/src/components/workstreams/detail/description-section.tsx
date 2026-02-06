interface DescriptionSectionProps {
  description?: string;
}

export function DescriptionSection({ description }: DescriptionSectionProps) {
  if (!description) return null;

  return (
    <div data-testid="description-section">
      <h3 className="text-sm font-medium">Description</h3>
      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
    </div>
  );
}
