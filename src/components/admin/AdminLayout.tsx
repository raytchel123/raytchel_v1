import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, GitBranch, Brain, MessageSquare, Calendar, BookTemplate as Template, Users, Settings, BarChart2, FileText, Zap, Diamond } from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';

export function AdminLayout() {
  const location = useLocation();
  const { currentOrg } = useAdminStore();

  const menuItems = [
    { 
      icon: <LayoutDashboard className="w-5 h-5" />, 
      label: 'Dashboard', 
      path: '/admin' 
    },
    { 
      icon: <GitBranch className="w-5 h-5" />, 
      label: 'Fluxos', 
      path: '/admin/flows' 
    },
    { 
      icon: <Brain className="w-5 h-5" />, 
      label: 'Intenções & Q&A', 
      path: '/admin/knowledge' 
    },
    { 
      icon: <Calendar className="w-5 h-5" />, 
      label: 'Serviços & Agenda', 
      path: '/admin/services' 
    },
    { 
      icon: <Template className="w-5 h-5" />, 
      label: 'Templates', 
      path: '/admin/templates' 
    },
    { 
      icon: <Users className="w-5 h-5" />, 
      label: 'Handoff', 
      path: '/admin/handoff' 
    },
    { 
      icon: <Zap className="w-5 h-5" />, 
      label: 'Conexões', 
      path: '/admin/connections' 
    },
    { 
      icon: <FileText className="w-5 h-5" />, 
      label: 'Auditoria', 
      path: '/admin/audit' 
    }
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r">
        <div className="flex items-center h-16 px-6 border-b">
          <Link to="/admin" className="flex items-center space-x-3">
            <Diamond className="w-8 h-8 text-indigo-600" />
            <div>
              <span className="font-bold text-lg">Raytchel Admin</span>
              <p className="text-xs text-gray-500">{currentOrg?.name}</p>
            </div>
          </Link>
        </div>
        
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}