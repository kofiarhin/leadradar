import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchWorkspace } from '../api/workspace';
import { useLogout } from '../features/auth/useLogin';

/**
 * Authenticated placeholder.
 *
 * Deliberately minimal: dashboard metrics are a later roadmap outcome. This proves the
 * session reaches a protected resource and that signing out works.
 */
export function DashboardPage(): ReactElement {
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const workspace = useQuery({
    queryKey: ['workspace'],
    queryFn: fetchWorkspace,
    retry: false,
  });

  async function handleSignOut(): Promise<void> {
    await logoutMutation.mutateAsync();
    await navigate('/login', { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Workspace</p>
            {workspace.isPending ? (
              <p role="status" aria-live="polite" className="text-sm text-slate-600">
                Loading…
              </p>
            ) : workspace.isError ? (
              <p role="alert" className="text-sm text-red-700">
                The workspace could not be loaded.
              </p>
            ) : (
              <h1 className="text-2xl font-semibold text-slate-900">{workspace.data.name}</h1>
            )}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={logoutMutation.isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-60"
          >
            {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-medium text-slate-900">You are signed in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Campaigns, prospects, and outreach arrive in later work. This screen confirms the
            owner session is established.
          </p>
        </section>
      </div>
    </main>
  );
}
