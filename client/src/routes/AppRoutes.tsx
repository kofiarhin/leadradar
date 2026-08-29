import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireSession } from '../features/auth/RequireSession';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';

/** Route map for this slice (docs/SPEC.md §21). Later outcomes add their own routes. */
export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireSession>
            <DashboardPage />
          </RequireSession>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
