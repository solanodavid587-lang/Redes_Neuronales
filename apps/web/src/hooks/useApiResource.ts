import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage, type Page } from '../lib/api';

export function useApiResource<T>(path: string) {
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get<Page<T>>(path)
      .then((result) => { if (active) setData(result); })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, revision]);

  return { data, loading, error, reload };
}
