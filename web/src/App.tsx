import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PrivateRoute } from '@/components/PrivateRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CreateDocumentSetPage } from '@/pages/CreateDocumentSetPage';
import { DocumentSetDetailPage } from '@/pages/DocumentSetDetailPage';

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Private routes with layout */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/create-document-set"
            element={
              <PrivateRoute>
                <AppLayout>
                  <CreateDocumentSetPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/document-set/:setId"
            element={
              <PrivateRoute>
                <AppLayout>
                  <DocumentSetDetailPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
