import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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

const router = createBrowserRouter([
  { path: '/', element: <AppLayout><DashboardPage /></AppLayout> },
  { path: '/projects', element: <AppLayout><ProjectsPage /></AppLayout> },
  { path: '/architectures', element: <AppLayout><ArchitecturesPage /></AppLayout> },
  { path: '/datasets', element: <AppLayout><DatasetsPage /></AppLayout> },
  { path: '/training', element: <AppLayout><TrainingPage /></AppLayout> },
  { path: '/evaluation', element: <AppLayout><EvaluationPage /></AppLayout> },
  { path: '/model-registry', element: <AppLayout><ModelRegistryPage /></AppLayout> },
  { path: '/reports', element: <AppLayout><ReportsPage /></AppLayout> },
  { path: '/admin', element: <AppLayout><AdminPage /></AppLayout> } // <-- Nueva ruta
]);

export default function Router() {
  return <RouterProvider router={router} />;
}