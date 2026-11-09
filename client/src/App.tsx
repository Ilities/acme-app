import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/AppLayout';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { BillingPage } from './pages/billing/BillingPage';
import { CheckoutPage } from './pages/billing/CheckoutPage';
import { CheckoutSuccessPage } from './pages/billing/CheckoutSuccessPage';
import { BookingConfirmedPage } from './pages/booking/BookingConfirmedPage';
import { BookingPage } from './pages/booking/BookingPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAppointmentPage } from './pages/NewAppointmentPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { StaffPage } from './pages/StaffPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/book/:slug/confirmed" element={<BookingConfirmedPage />} />

      <Route
        element={
          <RequireAuth area="clinic">
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="appointments/new" element={<NewAppointmentPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/checkout" element={<CheckoutPage />} />
        <Route path="billing/success" element={<CheckoutSuccessPage />} />
      </Route>

      <Route
        path="admin"
        element={
          <RequireAuth area="admin">
            <AppLayout variant="admin" />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders" element={<AdminOrdersPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
