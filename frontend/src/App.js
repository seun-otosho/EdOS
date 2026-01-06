import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SchoolSetupPage from './pages/SchoolSetupPage';
import UsersPage from './pages/UsersPage';
import StudentsPage from './pages/StudentsPage';
import ClassesPage from './pages/ClassesPage';
import SubjectsPage from './pages/SubjectsPage';
import AttendancePage from './pages/AttendancePage';
import GradesPage from './pages/GradesPage';

// Protected Route Component
const ProtectedRoute = ({ children, allowedTypes }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedTypes && !allowedTypes.includes(user?.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Placeholder pages for routes that aren't fully implemented yet
const PlaceholderPage = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p>This feature is coming soon!</p>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes with Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Admin Routes */}
        <Route
          path="school-setup"
          element={
            <ProtectedRoute allowedTypes={['school_admin', 'super_admin', 'principal']}>
              <SchoolSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedTypes={['school_admin', 'super_admin', 'principal']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="classes"
          element={
            <ProtectedRoute allowedTypes={['school_admin', 'super_admin', 'principal']}>
              <ClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="subjects"
          element={
            <ProtectedRoute allowedTypes={['school_admin', 'super_admin', 'principal']}>
              <SubjectsPage />
            </ProtectedRoute>
          }
        />

        {/* Shared Routes */}
        <Route path="students" element={<StudentsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="grades" element={<GradesPage />} />

        {/* Teacher Routes */}
        <Route
          path="my-classes"
          element={
            <ProtectedRoute allowedTypes={['teacher']}>
              <PlaceholderPage title="My Classes" />
            </ProtectedRoute>
          }
        />
        <Route
          path="assignments"
          element={<GradesPage />}
        />
        <Route
          path="gradebook"
          element={<GradesPage />}
        />
        <Route
          path="schedule"
          element={<PlaceholderPage title="Schedule" />}
        />

        {/* Parent Routes */}
        <Route
          path="my-children"
          element={
            <ProtectedRoute allowedTypes={['parent']}>
              <PlaceholderPage title="My Children" />
            </ProtectedRoute>
          }
        />
        <Route
          path="leave-request"
          element={
            <ProtectedRoute allowedTypes={['parent']}>
              <PlaceholderPage title="Leave Request" />
            </ProtectedRoute>
          }
        />

        {/* Common Routes */}
        <Route path="timetable" element={<PlaceholderPage title="Timetable" />} />
        <Route path="calendar" element={<PlaceholderPage title="Calendar" />} />
        <Route path="messages" element={<PlaceholderPage title="Messages" />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="profile" element={<PlaceholderPage title="Profile" />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </Router>
  );
}

export default App;
