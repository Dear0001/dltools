import React from 'react';

export default function EmptyState({ icon, title, description, action, suggestions }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; suggestions?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground" aria-hidden="true">{icon}</div>}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
      {suggestions}
    </div>
  );
}
