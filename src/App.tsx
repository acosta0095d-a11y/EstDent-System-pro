import React from 'react';
import { PatientProvider, usePatient } from './context/PatientContext';
import { Sidebar } from './components/Sidebar';
import PatientRadar from './views/PatientRadar';
import PatientDashboard from './views/PatientDashboard/PatientDashboard';
import Agenda from './views/Agenda'; // <--- LA PIEZA QUE FALTABA
import './App.css';

const AppContent = () => {
  const { currentView, selectedPatient } = usePatient();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        
        {/* VISTA DE INICIO (Placeholder temporal) */}
        {currentView === 'inicio' && (
          <div className="fade-in" style={{ padding: '40px' }}>
            <h1 className="patient-name-pro">Bienvenido a EstDent Pro</h1>
          </div>
        )}

        {/* =======================================================
            EL MÓDULO DE PACIENTES (Navegación Anidada Real)
            ======================================================= */}
        {currentView === 'pacientes' && (
          <>
            {/* Si NO hay paciente seleccionado, mostramos el Radar */}
            {!selectedPatient && <PatientRadar />}
            
            {/* Si SÍ hay paciente seleccionado, mostramos su Expediente */}
            {selectedPatient && <PatientDashboard />}
          </>
        )}

        {/* =======================================================
            LA AGENDA (TURNERO / SALA DE ESPERA)
            ======================================================= */}
        {currentView === 'agenda' && <Agenda />}

        {/* MÓDULO DE INVENTARIO Y AJUSTES */}
        {currentView === 'inventario' && (
          <div className="fade-in" style={{ padding: '40px' }}>
            <h1 className="patient-name-pro">Módulo de Inventario</h1>
          </div>
        )}

        {currentView === 'ajustes' && (
          <div className="fade-in" style={{ padding: '40px' }}>
            <h1 className="patient-name-pro">Configuración del Sistema</h1>
          </div>
        )}

      </main>
    </div>
  );
};

export default function App() {
  return (
    <PatientProvider>
      <AppContent />
    </PatientProvider>
  );
}