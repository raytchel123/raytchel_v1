import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard,
  MessageSquare, 
  BarChart2, 
  Settings, 
  LogOut,
  Diamond,
  Calculator
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export function Layout() {
  console.log('Rendering Layout component'); // Debug log
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthStore();

  const menuItems = [
    { 
      icon: <LayoutDashboard className="w-5 h-5" />, 
      label: 'Dashboard', 
      path: '/' 
    },
    { 
      icon: <MessageSquare className="w-5 h-5" />, 
      label: 'Atendimento', 
      path: '/atendimento' 
    },
    { 
      icon: <Diamond className="w-5 h-5" />, 
      label: 'WhatsApp', 
      path: '/whatsapp' 
    },
    { 
      icon: <Calculator className="w-5 h-5" />, 
      label: 'MVP Admin', 
      path: '/mvp' 
    },
    { 
      icon: <BarChart2 className="w-5 h-5" />, 
      label: 'Analytics', 
      path: '/analytics' 
    },
    { 
      icon: <Settings className="w-5 h-5" />, 
      label: 'Configurações', 
      path: '/configuracoes' 
    }
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#1A1A2E] shadow-lg">
        <div className="flex items-center h-16 px-6 border-b border-[#16213E]">
          <Link to="/" className="flex items-center space-x-3 text-white">
            <Diamond className="w-8 h-8" />
            <span className="font-bold text-xl">Zaffira</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-[#16213E] text-white'
                  : 'text-gray-300 hover:bg-[#16213E] hover:text-white'
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
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Joalheria que entende, conversa e soluciona
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 mr-4">
              <span className="font-medium">Admin Zaffira</span>
              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                Administrador
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sair</span>
            </button>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}