import { AlertCircle } from 'lucide-react';

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <span id={id} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-ink">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </span>
  );
}

export default FieldError;
