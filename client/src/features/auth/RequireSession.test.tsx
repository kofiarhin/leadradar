import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../../api/auth';
import { RequireSession } from './RequireSession';

vi.mock('../../api/auth');

function renderGuarded(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  render(
    <Routes>
      <Route path="/login" element={<p>Login screen</p>} />
      <Route
        path="/"
        element={
          <RequireSession>
            <p>Protected content</p>
          </RequireSession>
        }
      />
    </Routes>,
    { wrapper },
  );
}

describe('RequireSession', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a loading state while the session is unresolved', () => {
    vi.mocked(authApi.fetchSession).mockReturnValue(new Promise(() => {}));

    renderGuarded();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('never renders protected content before the session resolves', () => {
    vi.mocked(authApi.fetchSession).mockReturnValue(new Promise(() => {}));

    renderGuarded();

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to the login screen when unauthenticated', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(null);

    renderGuarded();

    expect(await screen.findByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the protected content when authenticated', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue({
      user: { id: 'u1', email: 'owner@example.test' },
      workspace: { id: 'w1', name: 'LeadRadar' },
    });

    renderGuarded();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
  });
});
