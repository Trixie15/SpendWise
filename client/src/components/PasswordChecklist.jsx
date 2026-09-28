import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '../utils/passwordPolicy';

export default function PasswordChecklist({ password }) {
  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-2 text-xs ${ok ? 'text-jade' : 'text-pine-soft'}`}>
            {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
