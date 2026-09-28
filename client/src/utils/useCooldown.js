import { useEffect, useState } from 'react';

// Countdown in seconds, used for the "Resend code" button
export default function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);
  return [secondsLeft, setSecondsLeft];
}
