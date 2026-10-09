import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth, setUser, setSchool } from './store/authSlice';
import apiClient from './utils/apiClient';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import SchoolRegistration from './pages/SchoolRegistration';
import AdminDashboard from './pages/admin/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import FamilyDashboard from './pages/family/Dashboard';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      // If user explicitly logged out this browser session, reject stale tokens
      if (!token || sessionStorage.getItem('loggedOut')) {
        dispatch(clearAuth());
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/profile');
        // Successful login — clear any stale loggedOut flag
        sessionStorage.removeItem('loggedOut');
        dispatch(setUser(response.data.user));
        dispatch(setSchool(response.data.user.schoolId));
      } catch (error) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        dispatch(clearAuth());
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#7a4e2d]"></div>
          <p className="mt-4 text-[#7a4e2d]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-canvas">
        {isAuthenticated && <Navbar />}
        <Routes>
          <Route
            path="/"
            element={isAuthenticated && user?.role ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Landing />}
          />
          <Route
            path="/login"
            element={isAuthenticated && user?.role ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated && user?.role ? <Navigate to={`/${user.role}/dashboard`} replace /> : <SchoolRegistration />}
          />

          {isAuthenticated ? (
            <>
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/*"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/*"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/*"
                element={
                  <ProtectedRoute requiredRole="family">
                    <FamilyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to={user?.role ? `/${user.role}/dashboard` : '/'} />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
