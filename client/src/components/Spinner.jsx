import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-12 text-jade ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
    </div>
  );
}
