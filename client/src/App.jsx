import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import { ForgotPassword, ResetPassword } from './pages/PasswordPages';
import VerifyView from './pages/VerifyView';
import PrescriptionList from './pages/PrescriptionList';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import PrescriptionBuilder from './pages/PrescriptionBuilder';
import PrescriptionView from './pages/PrescriptionView';
import Profile from './pages/Profile';
import Help from './pages/Help';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminMedicines from './pages/admin/AdminMedicines';
import AdminAudit from './pages/admin/AdminAudit';
import AdminSupport from './pages/admin/AdminSupport';

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify/:code" element={<VerifyView />} />

      {/* doctor */}
      <Route element={<ProtectedRoute role="doctor" />}>
        <Route element={<Layout />}>
          <Route path="/" element={<PrescriptionList />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/prescriptions/new" element={<PrescriptionBuilder />} />
          <Route path="/prescriptions/:id" element={<PrescriptionView />} />
          <Route path="/prescriptions/:id/edit" element={<PrescriptionBuilder />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/help" element={<Help />} />
        </Route>
      </Route>

      {/* admin */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/doctors" element={<AdminDoctors />} />
          <Route path="/admin/medicines" element={<AdminMedicines />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
