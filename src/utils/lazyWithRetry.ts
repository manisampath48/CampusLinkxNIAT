import React, { lazy, ComponentType } from 'react';

/**
 * Enhanced React.lazy wrapper with automated retry mechanisms for handling
 * network glitches or stale chunk URLs across SPA deployments.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retriesLeft = 2,
  interval = 800
): React.LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (retries: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            const isModuleFetchError =
              error?.message &&
              /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
                error.message
              );

            if (retries > 0) {
              setTimeout(() => {
                attempt(retries - 1);
              }, interval);
            } else {
              // If repeated attempts fail due to stale deployed chunks, force a one-time clean reload
              if (isModuleFetchError && typeof window !== 'undefined') {
                const reloadKey = 'campuslink_chunk_retry_' + window.location.pathname;
                const hasRetried = sessionStorage.getItem(reloadKey);
                if (!hasRetried) {
                  sessionStorage.setItem(reloadKey, 'true');
                  window.location.reload();
                  return;
                }
              }
              reject(error);
            }
          });
      };

      attempt(retriesLeft);
    })
  );
}
