import { useState, useEffect } from 'react';
import { storage } from '../services/storage';

export function useStorage() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  return storage;
}
