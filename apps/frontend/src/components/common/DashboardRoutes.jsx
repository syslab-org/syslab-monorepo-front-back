// #apps/frontend/src/components/common/DashboardRoutes.jsx
import { ReactFlowProvider } from "@xyflow/react";
import { Navigate, Route, Routes } from 'react-router-dom';
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingFlowProvider } from '../../contexts/LoadingFlowContext';
import Dashboard from '../../pages/Dashboard';
import PlanDetailPage from '../../pages/Plans/PlanDetailPage';
import PlanListPage from '../../pages/Plans/PlanListPage';
import MainFlow from '../flow/MainFlow';
import VPCList from '../flow/pages/VPCList';
import MainLayout from '../layout/MainLayout';
import PanelAdmin from '../pages/PanelAdmin';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import TestComponent from '../pages/TestComponent';
import GeneralSettings from '../pages/settings/GeneralSettings';
import { UsersManagement } from '../pages/settings/UsersManagement';
import LoadingFlow from './LoadingFlow';
import ProtectedRoute from './ProtectedRoute';


const DashboardRoutes = () => {

  const { user } = useAuth()

  return (
    <LoadingFlowProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path='dashboard' element={<Dashboard />} />

          <Route path="overview" element={<TestComponent />} />

          <Route path='paneladmin' element={<PanelAdmin />} />


          <Route path='settings/amilist' element={

            <>
              <LoadingFlow />
              <SettingsPage />
            </>
          }
          />
          <Route path='settings/usersmanagement' element={
            <ProtectedRoute allowedRoles={[USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER]}>
              <>
                <LoadingFlow />
                <UsersManagement />
              </>
            </ProtectedRoute>
          } />



          <Route path='settings/profile' element={

            <>
              <LoadingFlow />
              <ProfilePage />
            </>
          }
          />

          {/* Encapsulating specific routes */}
          <Route path='vpcs' element={
            <>
              <LoadingFlow />
              <VPCList />
            </>
          } />

          <Route path='vpcs/:vpcid/mainflow' element={
            <>
              <LoadingFlow />
              <ReactFlowProvider><MainFlow /></ReactFlowProvider>
            </>
          } />

          <Route path='settings/general' element={
            <ProtectedRoute allowedRoles={[USER_ROL_STUDENT, USER_ROL_TEACHER]}>
              <>
                <LoadingFlow />
                <GeneralSettings />
              </>
            </ProtectedRoute>
          } />


          <Route
            path="/plans"
            element={
              <ProtectedRoute
                allowedRoles={[USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER]}>
                <PlanListPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/plans/:id"
            element={
              <ProtectedRoute allowedRoles={[USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER, USER_ROL_STUDENT]}>
                <PlanDetailPage />
              </ProtectedRoute>
            }
          />

        </Route>



      </Routes>
    </LoadingFlowProvider>

  );
};

export default DashboardRoutes;
