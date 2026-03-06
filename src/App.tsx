import React, { useState } from 'react';
import { LayoutDashboard, Users, FlaskConical, Package } from 'lucide-react';
import PatientRadar from './views/PatientRadar';
import PatientDashboard from './views/PatientDashboard/PatientDashboard';
import './App.css';

const App = () => {
  const [vistaActiva, setVistaActiva] = useState("pacientes");
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo-container"><img src="/logo.png" className="logo" alt="EstDent" /></div>
        <nav className="nav-menu">
          <button onClick={() => { setVistaActiva("dashboard"); setPacienteSeleccionado(null); }} className={vistaActiva === "dashboard" ? "active" : ""}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => { setVistaActiva("pacientes"); setPacienteSeleccionado(null); }} className={vistaActiva === "pacientes" ? "active" : ""}>
            <Users size={18} /> Pacientes
          </button>
          <button onClick={() => setVistaActiva("laboratorio")} className={vistaActiva === "laboratorio" ? "active" : ""}>
            <FlaskConical size={18} /> Laboratorio
          </button>
          <button onClick={() => setVistaActiva("inventario")} className={vistaActiva === "inventario" ? "active" : ""}>
            <Package size={18} /> Inventario
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {vistaActiva === "pacientes" && (
          !pacienteSeleccionado ? (
            <PatientRadar onSelect={(p: any) => setPacienteSeleccionado(p)} />
          ) : (
            <PatientDashboard 
              paciente={pacienteSeleccionado} 
              onBack={() => setPacienteSeleccionado(null)} 
            />
          )
        )}
      </main>
    </div>
  );
};

export default App;