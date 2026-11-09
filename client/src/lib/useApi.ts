import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

interface ApiState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<ApiState<T>>({
    data: undefined,
    error: undefined,
    loading: path !== null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (path === null) {
      return;
    }
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: undefined }));

    api.get<T>(path).then(
      (data) => {
        if (!cancelled) setState({ data, error: undefined, loading: false });
      },
      (error: Error) => {
        if (!cancelled) setState({ data: undefined, error, loading: false });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { ...state, reload };
}

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
