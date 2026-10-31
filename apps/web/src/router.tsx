import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import SignInPage from './auth/SignInPage';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import ArchitecturesPage from './features/architectures/pages/ArchitecturesPage';
import DatasetsPage from './features/datasets/pages/DatasetsPage';
import TrainingPage from './features/training/pages/TrainingPage';
import EvaluationPage from './features/evaluation/pages/EvaluationPage';
import ModelRegistryPage from './features/model-registry/pages/ModelRegistryPage';
import ReportsPage from './features/reports/pages/ReportsPage';
import AdminPage from './features/administration/pages/AdminPage'; // <-- Importar
import FundamentalsPage from './features/fundamentals/pages/FundamentalsPage';
import LandingPage from './features/landing/pages/LandingPage';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verificando sesión…</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppLayout><Outlet /></AppLayout>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verificando sesión…</div>;
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';
  return user ? <Navigate to={from} replace /> : <SignInPage />;
}

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verificando permisos…</div>;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <AdminPage />;
}

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginRoute /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/projects', element: <ProjectsPage /> },
      { path: '/architectures', element: <ArchitecturesPage /> },
      { path: '/datasets', element: <DatasetsPage /> },
      { path: '/training', element: <TrainingPage /> },
      { path: '/evaluation', element: <EvaluationPage /> },
      { path: '/fundamentals', element: <FundamentalsPage /> },
      { path: '/model-registry', element: <ModelRegistryPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/admin', element: <AdminRoute /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}