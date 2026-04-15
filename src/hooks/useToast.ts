import { useCallback, useRef, useState } from "react";

export function useToast(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback(
    (m: string) => {
      if (timer.current) window.clearTimeout(timer.current);
      setMessage(m);
      timer.current = window.setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  return { message, show };
}
