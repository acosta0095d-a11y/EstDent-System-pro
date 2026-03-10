import { Users, Calendar, Package, Settings, Home } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export const Sidebar = () => {
  // EXTRAEMOS setSelectedPatient PARA PODER LIMPIAR LA MEMORIA
  const { currentView, setCurrentView, setSelectedPatient } = usePatient();

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--brand-blue)', letterSpacing: '-1px' }}>
          EstDent
        </h1>
      </div>

      <nav className="nav-menu">
        <button className={currentView === 'inicio' ? 'active' : ''} onClick={() => setCurrentView('inicio')}>
          <Home size={18} style={{ marginRight: '10px' }} /> Inicio
        </button>
        
        {/* EL BOTÓN REPARADO: Ahora cambia la vista Y limpia al paciente seleccionado */}
        <button 
          className={currentView === 'pacientes' ? 'active' : ''} 
          onClick={() => {
            setCurrentView('pacientes');
            setSelectedPatient(null); // <-- ESTO MATA AL FANTASMA DEL PACIENTE ANTERIOR
          }}
        >
          <Users size={18} style={{ marginRight: '10px' }} /> Pacientes
        </button>
        
        <button className={currentView === 'agenda' ? 'active' : ''} onClick={() => setCurrentView('agenda')}>
          <Calendar size={18} style={{ marginRight: '10px' }} /> Agenda
        </button>
        
        <button className={currentView === 'inventario' ? 'active' : ''} onClick={() => setCurrentView('inventario')}>
          <Package size={18} style={{ marginRight: '10px' }} /> Inventario
        </button>

        <button className={currentView === 'ajustes' ? 'active' : ''} onClick={() => setCurrentView('ajustes')}>
          <Settings size={18} style={{ marginRight: '10px' }} /> Ajustes
        </button>
      </nav>
    </aside>
  );
};