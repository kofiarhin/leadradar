import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { LoginPage } from './LoginPage';

vi.mock('../api/auth');

const session = {
  user: { id: 'u1', email: 'owner@example.test' },
  workspace: { id: 'w1', name: 'LeadRadar' },
};

function renderLogin(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillCredentials(): Promise<void> {
  await userEvent.type(screen.getByLabelText(/email/i), 'owner@example.test');
  await userEvent.type(screen.getByLabelText(/password/i), 'a-password');
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authApi.fetchSession).mockResolvedValue(null);
  });

  it('exposes accessible, correctly typed fields', () => {
    renderLogin();

    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/password/i);

    expect(email).toHaveAttribute('type', 'email');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('signs the owner in and navigates to the protected destination', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session);

    renderLogin();
    await fillCredentials();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    // TanStack Query passes a context object as a second argument; only the
    // credentials matter here.
    expect(vi.mocked(authApi.login).mock.calls[0]?.[0]).toEqual({
      email: 'owner@example.test',
      password: 'a-password',
    });
  });

  it('can be completed with the keyboard alone', async () => {
    vi.mocked(authApi.login).mockResolvedValue(session);

    renderLogin();

    await userEvent.tab();
    await userEvent.keyboard('owner@example.test');
    await userEvent.tab();
    await userEvent.keyboard('a-password');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('shows one generic message that does not disclose whether the account exists', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.'),
    );

    renderLogin();
    await fillCredentials();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/invalid email or password/i);
    expect(alert.textContent).not.toMatch(/owner@example\.test/);
    expect(alert.textContent).not.toMatch(/not found|no account|unknown/i);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('shows a distinct message when throttled', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.'),
    );

    renderLogin();
    await fillCredentials();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/too many attempts/i);
  });

  it('disables the submit control while the request is in flight', async () => {
    let resolveLogin: ((value: typeof session) => void) | undefined;
    vi.mocked(authApi.login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    renderLogin();
    await fillCredentials();
    const button = screen.getByRole('button', { name: /sign in/i });
    await userEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveTextContent(/signing in/i);

    resolveLogin?.(session);
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('validates empty fields before calling the API', async () => {
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });
});
