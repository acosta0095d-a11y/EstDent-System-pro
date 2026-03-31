import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PatientProvider, usePatient } from './core/context/PatientContext';
import { Sidebar } from './shared/components/Sidebar';
import { PatientRadar } from './features/patients/pages/PatientRadar';
import { PatientDashboard } from './features/patients/pages/PatientDashboard';
import { GeneralConsultation } from './features/consultation/pages/GeneralConsultation';
import { OrthoConsultation } from './features/consultation/pages/OrthoConsultation';
import { Loader2 } from 'lucide-react';
import { NewPatientWizard } from './features/patients/pages/NewPatientWizard';

const MainLayout = () => {
  const { currentView, selectedPatient } = usePatient();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '260px', overflow: 'auto' }}>
        {currentView === 'inicio' && (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '24px' }}>
                <Loader2 size={48} style={{
                  margin: '0 auto',
                  color: '#3b82f6',
                  animation: 'spin 2s linear infinite'
                }} />
              </div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '12px'
              }}>
                Bienvenido a EstDent
              </h1>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                maxWidth: '480px',
                margin: '0 auto'
              }}>
                Cargando tu información clínica y de pacientes...
              </p>
            </div>
          </div>
        )}

        {currentView === 'pacientes' && (
          <>
            {!selectedPatient && <PatientRadar />}
            {selectedPatient && <PatientDashboard />}
          </>
        )}

        {currentView === 'agenda' && (
          <div style={{ padding: '40px', minHeight: '100vh' }}>
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
                📅 Agenda
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Módulo en desarrollo
              </p>
            </div>
          </div>
        )}

        {currentView === 'inventario' && (
          <div style={{ padding: '40px', minHeight: '100vh' }}>
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
                Inventario
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Módulo en desarrollo
              </p>
            </div>
          </div>
        )}

        {currentView === 'ajustes' && (
          <div style={{ padding: '40px', minHeight: '100vh' }}>
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
                Configuración
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Módulo en desarrollo
              </p>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const GeneralConsultaWrapper = () => {
  const { saveConsultation } = usePatient();
  const location = useLocation();

  return (
    <GeneralConsultation
      onExit={() => window.history.back()}
      onSave={saveConsultation}
      initialData={(location.state as any)?.initialData}
    />
  );
};

const OrthoConsultaWrapper = () => {
  const { saveConsultation } = usePatient();
  const location = useLocation();

  return (
    <OrthoConsultation
      onExit={() => window.history.back()}
      onSave={saveConsultation}
      initialData={(location.state as any)?.initialData}
    />
  );
};

const NewPatientWrapper = () => {
  return (
    <NewPatientWizard onClose={() => window.history.back()} />
  );
};

function App() {
  return (
    <BrowserRouter>
      <PatientProvider>
        <Routes>
          <Route path="/*" element={<MainLayout />} />
          <Route path="/consulta/general" element={<GeneralConsultaWrapper />} />
          <Route path="/consulta/ortodoncia" element={<OrthoConsultaWrapper />} />
          <Route path="/paciente/nuevo" element={<NewPatientWrapper />} />
        </Routes>
      </PatientProvider>
    </BrowserRouter>
  );
}

export default App;