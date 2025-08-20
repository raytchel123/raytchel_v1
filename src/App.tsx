import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginForm } from './components/auth/LoginForm';
import { SignUpForm } from './components/auth/SignUpForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ChatContainer } from './components/chat/ChatContainer';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { ClientSettings } from './components/client/ClientSettings';
import { WhatsAppDashboard } from './components/whatsapp/WhatsAppDashboard';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { FlowManager } from './components/admin/FlowManager';
import { KnowledgeManager } from './components/admin/KnowledgeManager';
import { HandoffQueue } from './components/admin/HandoffQueue';
import { MVPDashboard } from './components/mvp/MVPDashboard';

export default function App() {
  console.log('Rendering App component'); // Debug log

  // Ambiente de teste - bypass de autenticação
  const isTestEnvironment = true;

  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={isTestEnvironment ? <Navigate to="/" replace /> : <LoginForm />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />

        {/* Admin routes */}
        <Route path="/admin" element={isTestEnvironment ? <AdminLayout /> : <ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="flows" element={<FlowManager />} />
          <Route path="knowledge" element={<KnowledgeManager />} />
          <Route path="handoff" element={<HandoffQueue />} />
        </Route>

        {/* MVP Dashboard */}
        <Route path="/mvp" element={isTestEnvironment ? <MVPDashboard /> : <ProtectedRoute><MVPDashboard /></ProtectedRoute>} />

        {/* Protected routes - bypass em ambiente de teste */}
        <Route path="/" element={isTestEnvironment ? <Layout /> : <ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="atendimento" element={<ChatContainer />} />
          <Route path="whatsapp" element={<WhatsAppDashboard />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="configuracoes" element={<ClientSettings />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}