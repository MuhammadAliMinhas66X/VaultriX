import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { IncomeLayout } from './context/IncomeContext.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import GroupPage from './pages/GroupPage.jsx';
import JoinGroupPage from './pages/JoinGroupPage.jsx';
import MainShell from './components/layout/MainShell.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import IncomePage from './pages/IncomePage.jsx';
import LoansPage from './pages/LoansPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import BillsPage from './pages/BillsPage.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';
import RequireOnboarding from './components/RequireOnboarding.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import ToastViewport from './components/ToastViewport.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';

const PortfolioPage = lazy(() => import('./portfolio/PortfolioPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('./portfolio/PrivacyPolicyPage.jsx'));

function App() {
  const location = useLocation();
  return (
    <>
      <OfflineBanner />
      <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<div className="min-h-screen bg-white" />}>
              <PortfolioPage />
            </Suspense>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <Suspense fallback={<div className="min-h-screen bg-white" />}>
              <PrivacyPolicyPage />
            </Suspense>
          }
        />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route element={<RequireOnboarding />}>
            <Route element={<IncomeLayout />}>
              {/* One persistent shell: the sidebar is never rebuilt when moving between these pages. */}
              <Route element={<MainShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/income" element={<IncomePage />} />
                <Route path="/loans" element={<LoansPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/bills" element={<BillsPage />} />
                <Route path="/join-group" element={<JoinGroupPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/:id" element={<GroupPage />} />
              </Route>
            </Route>
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </ErrorBoundary>
      <ToastViewport />
    </>
  );
}

export default App;
