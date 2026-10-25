import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { AuthView } from './components/AuthView.js';

// Admin Views
import { AdminOverview } from './components/admin/AdminOverview.js';
import { CredentialAuditView } from './components/admin/CredentialAuditView.js';
import { SecurityCentreView } from './components/admin/SecurityCentreView.js';
import { ConfigRestoreView } from './components/admin/ConfigRestoreView.js';
import { AwsBackupsView } from './components/admin/AwsBackupsView.js';
import { UserManagementView } from './components/admin/UserManagementView.js';
import { SchoolRecordsView } from './components/admin/SchoolRecordsView.js';

// Teacher Views
import { TeacherDashboard } from './components/teacher/TeacherDashboard.js';

// Staff Views
import { StaffDashboard } from './components/staff/StaffDashboard.js';

// Student Views
import { StudentDashboard } from './components/student/StudentDashboard.js';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-mono text-slate-400 block tracking-wider uppercase">
            Initializing Nina International Security Core...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  // Set appropriate default tab when role changes
  const renderContent = () => {
    const role = user.role;

    if (role === 'admin') {
      switch (currentTab) {
        case 'credential-audit':
          return <CredentialAuditView />;
        case 'security-centre':
          return <SecurityCentreView />;
        case 'config-restore':
          return <ConfigRestoreView />;
        case 'aws-backups':
          return <AwsBackupsView />;
        case 'users':
          return <UserManagementView />;
        case 'school-records':
          return <SchoolRecordsView />;
        case 'overview':
        default:
          return <AdminOverview onNavigate={(t) => setCurrentTab(t)} />;
      }
    }

    if (role === 'teacher') {
      return <TeacherDashboard currentTab={currentTab} />;
    }

    if (role === 'staff') {
      return <StaffDashboard currentTab={currentTab} />;
    }

    // student
    return <StudentDashboard currentTab={currentTab} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Nina International Secure School Management System</strong> • v1.0.0
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Argon2id Salt & Pepper • RFC 6238 TOTP • Cloud Disaster Recovery
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
