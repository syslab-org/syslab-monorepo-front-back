// #apps/frontend/src/components/common/DashboardRoutes.jsx
import { ReactFlowProvider } from "@xyflow/react";
import { Navigate, Route, Routes } from 'react-router-dom';
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '@/constants';
import { LoadingFlowProvider } from '@/contexts/LoadingFlowContext';
import Dashboard from '@/pages/Dashboard';
import PlanDetailPage from '@/pages/Plans/PlanDetailPage';
import PlanListPage from '@/pages/Plans/PlanListPage';
import { MainFlow, VPCList, WizardProvider } from '@/features/networkCanvas';
import MainLayout from '@/components/layout/MainLayout';
import PanelAdmin from '@/components/pages/PanelAdmin';
import ProfilePage from '@/components/pages/ProfilePage';
import SettingsPage from '@/components/pages/SettingsPage';
import TestComponent from '@/components/pages/TestComponent';
import GeneralSettings from '@/components/pages/settings/GeneralSettings';
import { UsersManagement } from '@/components/pages/settings/UsersManagement';
import LoadingFlow from '@/components/common/LoadingFlow';
import ProtectedRoute from '@/components/common/ProtectedRoute';


const DashboardRoutes = () => {
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
          <Route path='vpcs/*' element={
            <WizardProvider>
              <LoadingFlow />
              <Routes>
                <Route
                  index
                  element={<VPCList />}
                />
                <Route
                  path=':vpcid/mainflow'
                  element={
                    <ReactFlowProvider>
                      <MainFlow />
                    </ReactFlowProvider>
                  }
                />
              </Routes>
            </WizardProvider>
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
