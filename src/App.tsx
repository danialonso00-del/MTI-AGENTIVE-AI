import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useRouteError } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

const Sales = lazy(() => import('@/features/sales/SalesAssistantPage'));
const Tenders = lazy(() => import('@/features/tenders/TendersPage'));
const Panel = lazy(() => import('@/features/panel/PanelPage'));
const UnifiedInbox = lazy(() => import('@/features/inbox/UnifiedInboxPage'));
const Approvals = lazy(() => import('@/features/approvals/ApprovalsPage'));
const Parts = lazy(() => import('@/features/parts/PartsPage'));
const Knowledge = lazy(() => import('@/features/knowledge/KnowledgePage'));
const Resources = lazy(() => import('@/features/resources/ResourcesPage'));
const Analytics = lazy(() => import('@/features/analytics/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const Solutions = lazy(() => import('@/features/solutions/SolutionsPage'));
const Inbox = lazy(() => import('@/features/manufacturing/InboxPage'));
const NewRequest = lazy(() => import('@/features/manufacturing/NewRequestPage'));
const Request = lazy(() => import('@/features/manufacturing/RequestPage'));
const Report = lazy(() => import('@/features/manufacturing/ReportPage'));
const PrintDrawing = lazy(() => import('@/features/manufacturing/PrintPages').then((m) => ({ default: m.PrintDrawing })));
const PrintRequirements = lazy(() => import('@/features/manufacturing/PrintPages').then((m) => ({ default: m.PrintRequirements })));
const Odoo = lazy(() => import('@/features/erp/OdooWorkspace'));
const Runs = lazy(() => import('@/features/runs/RunsPage'));
const Replay = lazy(() => import('@/features/runs/ReplayPage'));
const Integrations = lazy(() => import('@/features/integrations/IntegrationsPage'));
const Catalog = lazy(() => import('@/features/catalog/CatalogPage'));
const DemoPicker = lazy(() => import('@/features/demo/DemoPicker'));
const DemoPlayer = lazy(() => import('@/features/demo/DemoPlayer'));
const UseCases = lazy(() => import('@/features/usecases/UseCasesPage'));
const Architecture = lazy(() => import('@/features/architecture/ArchitecturePage'));

const Page = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="mx-auto max-w-[1680px] space-y-3 px-6 py-6"><div className="skeleton h-10 w-72 rounded-xl" /><div className="skeleton h-[420px] rounded-2xl" /></div>}>{children}</Suspense>
);

function RouteError() {
  const err = useRouteError() as Error | undefined;
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-[22px] font-semibold">Algo no ha ido bien</h1>
      <p className="mt-2 text-[14px] text-ink-3">{err?.message ?? 'Error inesperado'}</p>
      <div className="mt-5 flex justify-center gap-2">
        <a href="/" className="rounded-[10px] bg-gold px-4 py-2 text-[14px] font-semibold text-navy">Volver al inicio</a>
        <button className="rounded-[10px] px-4 py-2 text-[14px] ring-1 ring-line-strong" onClick={() => { localStorage.removeItem('mti-agentive-studio'); location.href = '/'; }}>Restablecer datos demo</button>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/informe/:reqId/:versionId', element: <Page><Report /></Page> },
  { path: '/demo/:scenarioId', element: <Page><DemoPlayer /></Page>, errorElement: <RouteError /> },
  { path: '/print/plano/:key', element: <Page><PrintDrawing /></Page> },
  { path: '/print/requisitos/:ref', element: <Page><PrintRequirements /></Page> },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Page><Panel /></Page> },
      { path: 'presentacion', element: <Page><Solutions /></Page> },
      { path: 'bandeja', element: <Page><UnifiedInbox /></Page> },
      { path: 'aprobaciones', element: <Page><Approvals /></Page> },
      { path: 'comercial', element: <Page><Sales /></Page> },
      { path: 'licitaciones/:id?/:tab?', element: <Page><Tenders /></Page> },
      { path: 'piezas/:pn?', element: <Page><Parts /></Page> },
      { path: 'conocimiento', element: <Page><Knowledge /></Page> },
      { path: 'recursos', element: <Page><Resources /></Page> },
      { path: 'analitica', element: <Page><Analytics /></Page> },
      { path: 'ajustes', element: <Page><SettingsPage /></Page> },
      { path: 'agentes', element: <Page><Architecture /></Page> },
      { path: 'fabricacion', element: <Page><Inbox /></Page> },
      { path: 'fabricacion/nueva', element: <Page><NewRequest /></Page> },
      { path: 'fabricacion/:id/:tab?', element: <Page><Request /></Page> },
      { path: 'odoo/*', element: <Page><Odoo /></Page> },
      { path: 'ejecuciones', element: <Page><Runs /></Page> },
      { path: 'ejecuciones/:runId', element: <Page><Replay /></Page> },
      { path: 'integraciones', element: <Page><Integrations /></Page> },
      { path: 'catalogo/:caseId?', element: <Page><Catalog /></Page> },
      { path: 'arquitectura', element: <Navigate to="/agentes" replace /> },
      { path: 'casos/:caseId?', element: <Page><UseCases /></Page> },
      { path: 'demo', element: <Page><DemoPicker /></Page> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
