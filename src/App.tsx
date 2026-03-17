import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PatientProvider, usePatient } from './core/context/PatientContext';
import { Sidebar } from './shared/components/Sidebar';
import { PatientRadar } from './features/patients/pages/PatientRadar';
import { PatientDashboard } from './features/patients/pages/PatientDashboard';
import { GeneralConsultation } from './features/consultation/pages/GeneralConsultation';
// import { OrthoConsultation } from './features/consultation/pages/OrthoConsultation'; // Comentada por ahora

// Layout principal con Sidebar y navegación
const MainLayout = () => {
  const { currentView, selectedPatient } = usePatient();

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '260px', padding: '20px' }}>
        {/* Inicio */}
        {currentView === 'inicio' && (
          <div>
            <h1 style={{ color: '#00A4E4' }}>Inicio</h1>
          </div>
        )}

        {/* Pacientes */}
        {currentView === 'pacientes' && (
          <>
            {!selectedPatient && <PatientRadar />}
            {selectedPatient && <PatientDashboard />}
          </>
        )}

        {/* Agenda */}
        {currentView === 'agenda' && (
          <div>
            <h1>Agenda</h1>
          </div>
        )}

        {/* Inventario */}
        {currentView === 'inventario' && (
          <div>
            <h1>Inventario</h1>
          </div>
        )}

        {/* Ajustes */}
        {currentView === 'ajustes' && (
          <div>
            <h1>Ajustes</h1>
          </div>
        )}
      </main>
    </div>
  );
};

// Wrapper para consulta general (la que estamos trabajando)
const GeneralConsultaWrapper = () => {
  return (
    <GeneralConsultation onExit={() => window.history.back()} />
  );
};

// Wrapper para ortodoncia (comentado hasta que la necesitemos)
// const OrthoConsultaWrapper = () => {
//   return (
//     <OrthoConsultation onExit={() => window.history.back()} />
//   );
// };

function App() {
  return (
    <BrowserRouter>
      <PatientProvider>
        <Routes>
          {/* Ruta principal con Sidebar */}
          <Route path="/*" element={<MainLayout />} />
          
          {/* Ruta de consulta general (la que estamos usando) */}
          <Route path="/consulta/general" element={<GeneralConsultaWrapper />} />
          
          {/* Ruta de ortodoncia (comentada) */}
          {/* <Route path="/consulta/ortodoncia" element={<OrthoConsultaWrapper />} /> */}
        </Routes>
      </PatientProvider>
    </BrowserRouter>
  );
}

export default App;