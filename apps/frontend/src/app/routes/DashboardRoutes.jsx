// apps/frontend/src/app/routes/DashboardRoutes.jsx
import { ReactFlowProvider } from "@xyflow/react";
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '@/shared/constants';
import { LoadingFlowProvider } from '@/app/providers/LoadingFlowContext';
import Dashboard from '@/features/admin/pages/Dashboard';
import PlanDetailPage from '@/features/plans/pages/PlanDetailPage';
import PlanListPage from '@/features/plans/pages/PlanListPage';
import { CanvasFlowPage, LabsPage, WizardProvider } from '@/features/networkCanvas';
import MainLayout from '@/shared/ui/layouts/MainLayout';
import PanelAdmin from '@/features/admin/pages/PanelAdmin';
import ProfilePage from '@/features/admin/pages/ProfilePage';
import { SettingsPage } from "@/features/settings";
import GeneralSettings from '@/features/settings/pages/GeneralSettings';
import CoursesManagement from '@/features/settings/pages/CoursesManagement';
import { UsersManagement } from '@/features/settings/pages/UsersManagement';
import ProtectedRoute from '@/shared/ui/organisms/ProtectedRoute'

const LabsLayout = () => (
  <WizardProvider>
    <Outlet />
  </WizardProvider>
);


const DashboardRoutes = () => {
  return (
    <LoadingFlowProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path='dashboard' element={<Dashboard />} />

          <Route path='paneladmin' element={<PanelAdmin />} />

          <Route path='settings/amilist' element={<SettingsPage />} />
          <Route path='settings/usersmanagement' element={
            <ProtectedRoute allowedRoles={[USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER]}>
              <UsersManagement />
            </ProtectedRoute>
          } />
          <Route path='settings/courses' element={
            <ProtectedRoute allowedRoles={[USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER]}>
              <CoursesManagement />
            </ProtectedRoute>
          } />

          <Route path='settings/profile' element={<ProfilePage />} />

          <Route path='labs' element={<LabsLayout />}>
            <Route index element={<LabsPage />} />
            <Route
              path=':labId/canvas'
              element={
                <ReactFlowProvider>
                  <CanvasFlowPage />
                </ReactFlowProvider>
              }
            />
          </Route>

          <Route path='vpcs' element={<Navigate to="/admin/labs" replace />} />
          <Route
            path='vpcs/:vpcid/mainflow'
            element={
              <ReactFlowProvider>
                <CanvasFlowPage />
              </ReactFlowProvider>
            }
          />

          <Route path='settings/general' element={
            <ProtectedRoute allowedRoles={[USER_ROL_STUDENT, USER_ROL_TEACHER]}>
              <GeneralSettings />
            </ProtectedRoute>
          } />


          <Route
            path="/plans"
            element={
              <ProtectedRoute
                allowedRoles={[USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER, USER_ROL_STUDENT]}>
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
