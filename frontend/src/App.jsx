import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { IncomeLayout } from './context/IncomeContext.jsx';
import IncomePage from './pages/IncomePage.jsx';
import LoansPage from './pages/LoansPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';
import RequireOnboarding from './components/RequireOnboarding.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import ToastViewport from './components/ToastViewport.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';

const PortfolioPage = lazy(() => import('./portfolio/PortfolioPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('./portfolio/PrivacyPolicyPage.jsx'));

function App() {
  return (
    <>
      <OfflineBanner />
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
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
            </Route>
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}

export default App;
