import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import AttendanceQuincenal from './pages/AttendanceQuincenal';
import Emails from './pages/Emails';
import EmailHistory from './pages/EmailHistory';
import UsersView from './pages/Users/UsersView'; // Nuevo sistema de usuarios
import RealtimeDashboard from './pages/RealtimeDashboard';
import Confirmation from './pages/Confirmation';
import LoadTest from './pages/LoadTest';

import './App.css';
import Privacy from './pages/Privacy';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="dashboard-realtime" element={<RealtimeDashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="attendance" element={<AttendanceQuincenal />} />
              <Route path="emails" element={<Emails />} />
              <Route path="email-history" element={<EmailHistory />} />
              <Route path="users" element={<UsersView />} />
              <Route path="loadtest" element={<LoadTest />} />
            </Route>
            <Route path="confirmation" element={<Confirmation />} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
