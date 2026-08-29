import type { ReactElement, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useSession } from './useSession';

interface RequireSessionProps {
  children: ReactNode;
}

/**
 * Route guard.
 *
 * Protected content is never rendered while the session is unresolved, so a brief
 * flash of authenticated UI cannot occur before a redirect.
 */
export function RequireSession({ children }: RequireSessionProps): ReactElement {
  const session = useSession();

  if (session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
          Loading…
        </p>
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
