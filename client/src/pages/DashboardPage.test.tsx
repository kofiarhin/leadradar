import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import * as verticalProfileApi from '../api/vertical-profile';
import * as workspaceApi from '../api/workspace';
import { DashboardPage } from './DashboardPage';

vi.mock('../api/auth');
vi.mock('../api/vertical-profile');
vi.mock('../api/workspace');

const savedProfile = {
  id: 'vp1',
  workspaceId: 'w1',
  name: 'Primary ICP',
  offer: 'Lead generation for B2B teams',
  targetRoles: ['Founder'],
  targetIndustries: ['SaaS'],
  targetRegions: ['United Kingdom'],
  positiveSignals: ['Discussing pipeline'],
  negativeSignals: ['Student'],
  outreachGoal: 'BOOK_CALL' as const,
  outreachTone: 'Concise and professional',
  version: 1,
  createdAt: '2026-08-29T12:00:00.000Z',
  updatedAt: '2026-08-29T12:00:00.000Z',
};

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
    vi.mocked(workspaceApi.fetchWorkspace).mockResolvedValue({ id: 'w1', name: 'LeadRadar' });
    vi.mocked(verticalProfileApi.fetchVerticalProfile).mockResolvedValue(null);
  });

  it('shows the authenticated workspace and a create-profile form', async () => {
    renderDashboard();

    expect(await screen.findByText('LeadRadar')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /create profile/i })).toBeInTheDocument();
  });

  it('loads an existing profile into the form', async () => {
    vi.mocked(verticalProfileApi.fetchVerticalProfile).mockResolvedValue(savedProfile);

    renderDashboard();

    expect(await screen.findByDisplayValue('Lead generation for B2B teams')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Founder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('creates a profile using comma-separated targeting values', async () => {
    vi.mocked(verticalProfileApi.saveVerticalProfile).mockResolvedValue(savedProfile);
    const user = userEvent.setup();

    renderDashboard();

    await user.type(await screen.findByLabelText(/offer/i), 'Lead generation for B2B teams');
    await user.type(screen.getByLabelText(/target roles/i), 'Founder, Head of Sales');
    await user.type(screen.getByLabelText(/target industries/i), 'SaaS');
    await user.type(screen.getByLabelText(/target regions/i), 'United Kingdom');
    await user.type(screen.getByLabelText(/positive signals/i), 'Discussing pipeline');
    await user.type(screen.getByLabelText(/negative signals/i), 'Student');
    await user.click(screen.getByRole('button', { name: /create profile/i }));

    expect(verticalProfileApi.saveVerticalProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRoles: ['Founder', 'Head of Sales'],
        outreachGoal: 'BOOK_CALL',
      }),
    );
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
  });

  it('logs out and returns to the login screen', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    expect(authApi.logout).toHaveBeenCalled();
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  it('reports a profile that could not be loaded', async () => {
    vi.mocked(verticalProfileApi.fetchVerticalProfile).mockRejectedValue(new Error('boom'));

    renderDashboard();

    expect(await screen.findByText('The vertical profile could not be loaded.')).toHaveAttribute(
      'role',
      'alert',
    );
  });
});
