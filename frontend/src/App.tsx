import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DossiersList from './pages/dossiers/DossiersList';
import DossierDetail from './pages/dossiers/DossierDetail';
import ClientsList from './pages/clients/ClientsList';
import ClientDetail from './pages/clients/ClientDetail';
import ActesList from './pages/actes/ActesList';
import ActesAValider from './pages/actes/ActesAValider';
import FacturesList from './pages/facturation/FacturesList';
import FactureDetail from './pages/facturation/FactureDetail';
import Agenda from './pages/agenda/Agenda';
import Rapports from './pages/rapports/Rapports';
import Administration from './pages/administration/Administration';
import ParametresCabinet from './pages/administration/ParametresCabinet';
import UsersList from './pages/utilisateurs/UsersList';
import ProfilPersonnel from './pages/profil/ProfilPersonnel';
import PortailLogin from './pages/portail/PortailLogin';
import PortailDashboard from './pages/portail/PortailDashboard';
import PortailDossierDetail from './pages/portail/PortailDossierDetail';
import SuperAdminLogin from './pages/super-admin/SuperAdminLogin';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import DashboardLayout from './layouts/DashboardLayout';
import PortailLayout from './layouts/PortailLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedPortailRoute from './components/ProtectedPortailRoute';
import SuperAdminRoute from './components/SuperAdminRoute';

export default function App() {
  return (
    <BrowserRouter>
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

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

