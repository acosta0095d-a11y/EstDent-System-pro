import { Home, Users, Calendar, Package, Settings } from 'lucide-react';
import { usePatient } from '../../core/context/PatientContext';

export const Sidebar = () => {
  const { currentView, setCurrentView } = usePatient();

  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'white',
      borderRight: '1px solid #e2e8f0',
      height: '100vh',
      position: 'fixed',
      padding: '20px 0'
    }}>
      <div style={{ padding: '0 24px 30px' }}>
        <h1 style={{ color: '#00A4E4', fontSize: '28px', fontWeight: 900 }}>EstDent</h1>
      </div>
      <nav style={{ padding: '0 12px' }}>
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentView(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              width: '100%',
              border: 'none',
              background: currentView === id ? '#e6f6fc' : 'transparent',
              color: currentView === id ? '#00A4E4' : '#64748b',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
};