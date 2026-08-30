import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireSession } from '../features/auth/RequireSession';
import { CampaignDetailPage } from '../pages/CampaignDetailPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { NewCampaignPage } from '../pages/NewCampaignPage';

function protectedPage(element: ReactElement): ReactElement {
  return <RequireSession>{element}</RequireSession>;
}

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={protectedPage(<DashboardPage />)} />
      <Route path="/campaigns/new" element={protectedPage(<NewCampaignPage />)} />
      <Route path="/campaigns/:campaignId" element={protectedPage(<CampaignDetailPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
