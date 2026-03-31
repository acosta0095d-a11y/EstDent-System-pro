import { Home, Users, Calendar, Package, Settings } from 'lucide-react';
import { usePatient } from '../../core/context/PatientContext';

export const Sidebar = () => {
  const { currentView, setCurrentView } = usePatient();

  const menuItems = [
    { id: 'inicio', label: 'Dashboard', icon: Home },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'ajustes', label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      <style>{`
        .sidebar {
          width: 260px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          height: 100vh;
          position: fixed;
          padding: 24px 0;
          box-shadow: 1px 0 2px rgba(0,0,0,.05);
          display: flex;
          flex-direction: column;
          z-index: 1000;
        }

        .sidebar-header {
          padding: 0 24px 24px;
          border-bottom: 1px solid #f3f4f6;
        }

        .sidebar-logo {
          font-size: 22px;
          font-weight: 700;
          color: #3b82f6;
          letter-spacing: -0.5px;
        }

        .sidebar-nav {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          color: #6b7280;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .sidebar-btn:hover {
          background: #f9fafb;
          color: #3b82f6;
          border-color: #e5e7eb;
        }

        .sidebar-btn.active {
          background: #eff6ff;
          color: #3b82f6;
          border-color: #3b82f6;
          font-weight: 600;
        }

        .sidebar-btn svg {
          transition: transform 0.2s ease;
        }

        .sidebar-btn:hover svg {
          transform: scale(1.1);
        }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">EstDent</h1>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentView(id)}
              className={`sidebar-btn ${currentView === id ? 'active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};