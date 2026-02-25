import * as React from 'react';

/**
 * Returns a value that updates only after the source value has been stable for `delayMs`.
 * Use for expensive children (e.g. live previews) so they don't re-render on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debouncedValue;
}
