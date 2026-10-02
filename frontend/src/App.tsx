import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DossiersList = lazy(() => import('./pages/dossiers/DossiersList'));
const DossierDetail = lazy(() => import('./pages/dossiers/DossierDetail'));
const ClientsList = lazy(() => import('./pages/clients/ClientsList'));
const ClientDetail = lazy(() => import('./pages/clients/ClientDetail'));
const ActesList = lazy(() => import('./pages/actes/ActesList'));
const ActesAValider = lazy(() => import('./pages/actes/ActesAValider'));
const FacturesList = lazy(() => import('./pages/facturation/FacturesList'));
const FactureDetail = lazy(() => import('./pages/facturation/FactureDetail'));
const CreancesList = lazy(() => import('./pages/recouvrement/CreancesList'));
const CreanceDetail = lazy(() => import('./pages/recouvrement/CreanceDetail'));
const Agenda = lazy(() => import('./pages/agenda/Agenda'));
const Rapports = lazy(() => import('./pages/rapports/Rapports'));
const Administration = lazy(() => import('./pages/administration/Administration'));
const ParametresCabinet = lazy(() => import('./pages/administration/ParametresCabinet'));
const UsersList = lazy(() => import('./pages/utilisateurs/UsersList'));
const ProfilPersonnel = lazy(() => import('./pages/profil/ProfilPersonnel'));
const PortailLogin = lazy(() => import('./pages/portail/PortailLogin'));
const PortailDashboard = lazy(() => import('./pages/portail/PortailDashboard'));
const PortailDossierDetail = lazy(() => import('./pages/portail/PortailDossierDetail'));
const SuperAdminLogin = lazy(() => import('./pages/super-admin/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
import DashboardLayout from './layouts/DashboardLayout';
import PortailLayout from './layouts/PortailLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedPortailRoute from './components/ProtectedPortailRoute';
import SuperAdminRoute from './components/SuperAdminRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-navy-100 border-t-navy-700"
              role="status"
              aria-label="Chargement de la page"
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-navy-800">
                Chargement de la page...
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Veuillez patienter un instant.
              </p>
            </div>
          </div>
        }
      >
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/portail/login" element={<PortailLogin />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dossiers" element={<DossiersList />} />
            <Route path="/dossiers/:id" element={<DossierDetail />} />
            <Route path="/clients" element={<ClientsList roleTiersFixe="CLIENT" />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/debiteurs" element={<ClientsList roleTiersFixe="DEBITEUR" />} />
            <Route path="/debiteurs/:id" element={<ClientDetail />} />
            <Route path="/actes" element={<ActesList />} />
            <Route path="/actes/a-valider" element={<ActesAValider />} />
            <Route path="/facturation" element={<FacturesList />} />
            <Route path="/facturation/:id" element={<FactureDetail />} />
            <Route path="/recouvrement" element={<CreancesList />} />
            <Route path="/recouvrement/:id" element={<CreanceDetail />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/rapports" element={<Rapports />} />
            <Route path="/administration" element={<Administration />} />
            <Route path="/administration/cabinet" element={<ParametresCabinet />} />
            <Route path="/utilisateurs" element={<UsersList />} />
            <Route path="/profil" element={<ProfilPersonnel />} />
          </Route>
        </Route>

        <Route element={<ProtectedPortailRoute />}>
          <Route element={<PortailLayout />}>
            <Route path="/portail" element={<PortailDashboard />} />
            <Route path="/portail/dossiers/:id" element={<PortailDossierDetail />} />
          </Route>
        </Route>

        <Route element={<SuperAdminRoute />}>
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
