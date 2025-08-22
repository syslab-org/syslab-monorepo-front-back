import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import TestComponent from '../pages/TestComponent';
import MainFlow from '../flow/MainFlow';
import PanelAdmin from '../pages/PanelAdmin';
import { ReactFlowProvider } from "@xyflow/react";
import MainLayout from '../layout/MainLayout';
import { Navigate } from 'react-router-dom';
import VPCList from '../flow/pages/VPCList';
import { LoadingFlowProvider } from '../../contexts/LoadingFlowContext';
import LoadingFlow from './LoadingFlow';
import SettingsPage from '../pages/SettingsPage';
import { UsersManagement } from '../pages/settings/UsersManagement';
import ProfilePage from '../pages/ProfilePage';
import { useAuth } from '../../contexts/AuthContext';
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '../../constants';
import ProtectedRoute from './ProtectedRoute';
import GeneralSettings from '../pages/settings/GeneralSettings';


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
                                <GeneralSettings/>
                            </>
                        </ProtectedRoute>
                    } />

                </Route>
            </Routes>
        </LoadingFlowProvider>

    );
};

export default DashboardRoutes;
