import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import * as workspaceApi from '../api/workspace';
import { DashboardPage } from './DashboardPage';

vi.mock('../api/auth');
vi.mock('../api/workspace');

function renderDashboard(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/login" element={<p>Login screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a loading state before the workspace arrives', () => {
    vi.mocked(workspaceApi.fetchWorkspace).mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('names the authenticated workspace', async () => {
    vi.mocked(workspaceApi.fetchWorkspace).mockResolvedValue({ id: 'w1', name: 'LeadRadar' });

    renderDashboard();

    expect(await screen.findByText('LeadRadar')).toBeInTheDocument();
  });

  it('logs out and returns to the login screen', async () => {
    vi.mocked(workspaceApi.fetchWorkspace).mockResolvedValue({ id: 'w1', name: 'LeadRadar' });
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    expect(authApi.logout).toHaveBeenCalled();
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  it('reports a workspace that could not be loaded', async () => {
    vi.mocked(workspaceApi.fetchWorkspace).mockRejectedValue(new Error('boom'));

    renderDashboard();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
