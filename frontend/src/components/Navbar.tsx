import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  ShieldCheck,
  LogOut,
  Menu,
  X,
  School,
  Lock,
  FileText,
  Database,
  History,
  Users,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const role = user.role;

  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { id: 'overview', label: 'Overview', icon: School },
        { id: 'credential-audit', label: 'Credential Audit', icon: Lock, badge: 'Academic' },
        { id: 'security-centre', label: 'Security Centre', icon: ShieldCheck },
        { id: 'config-restore', label: 'Restore Points', icon: History },
        { id: 'aws-backups', label: 'Disaster Recovery', icon: Database },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'school-records', label: 'School Records', icon: FileText },
      ];
    }
    if (role === 'teacher') {
      return [
        { id: 'teacher-classes', label: 'My Classes & Attendance', icon: School },
        { id: 'teacher-grades', label: 'Assessment & Grades', icon: FileText },
      ];
    }
    if (role === 'staff') {
      return [
        { id: 'staff-enrolment', label: 'Student Enrolment', icon: Users },
        { id: 'staff-roster', label: 'School Rosters', icon: School },
      ];
    }
    // Student
    return [
      { id: 'student-overview', label: 'My Profile & Grades', icon: School },
      { id: 'student-timetable', label: 'My Timetable', icon: FileText },
      { id: 'student-security', label: '2FA & Security', icon: ShieldCheck },
    ];
  };

  const navItems = getNavItems();

  const handleTabClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & School Name: Never shrinks or wraps */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center font-extrabold text-white text-base shadow-md shadow-blue-500/25">
              NI
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-base font-bold tracking-tight text-white leading-none">
                Nina International
              </span>
              <span className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase mt-1 leading-none">
                Secure School System
              </span>
            </div>
          </div>

          {/* Desktop Navigation: Horizontal flex with horizontal scroll fallback if viewport tight */}
          <div className="hidden lg:flex items-center space-x-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* User Profile & Logout: Never shrinks */}
          <div className="hidden lg:flex items-center space-x-3 shrink-0">
            <div className="text-right flex flex-col justify-center">
              <span className="text-xs font-semibold text-white whitespace-nowrap leading-none">
                {user.fullName}
              </span>
              <div className="flex items-center justify-end space-x-1 mt-1 leading-none">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          <div className="pb-3 mb-2 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">{user.fullName}</div>
              <div className="text-xs text-sky-400 uppercase font-semibold">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 py-1 px-2.5 rounded bg-rose-500/10 border border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};
