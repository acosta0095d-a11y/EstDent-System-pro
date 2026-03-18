import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../core/context/PatientContext';
import { 
  ChevronLeft, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Activity,
  ClipboardList,
  Stethoscope,
  CheckCircle2
} from 'lucide-react';

// ============================================
// TIPOS DE CONSULTAS
// ============================================
interface Consulta {
  id: string;
  fecha: string;
  hora: string;
  tipo: 'odontologia' | 'ortodoncia';
  motivo: string;
  diagnostico: string;
  tratamiento: string;
  doctor: string;
  valor: number;
  estado: 'completada' | 'cancelada' | 'pendiente';
  observaciones?: string;
}

// ============================================
// MODAL PARA NUEVA CONSULTA (DISEÑO PRO + CONFIRMACIÓN)
// ============================================
interface NuevoConsultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tipo: 'odontologia' | 'ortodoncia') => void;
}

const NuevoConsultaModal = ({ isOpen, onClose, onSelect }: NuevoConsultaModalProps) => {
  // Estado para controlar si estamos eligiendo o confirmando
  const [confirming, setConfirming] = useState<'odontologia' | 'ortodoncia' | null>(null);

  const handleClose = () => {
    setConfirming(null); // Reseteamos al cerrar
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        width: '480px',
        maxWidth: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        border: '1px solid #e5e5e5',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 32px', borderBottom: '1px solid #f0f0f0'
        }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1f', marginBottom: '4px' }}>
              {confirming ? 'Confirmar inicio' : 'Nueva Consulta'}
            </h3>
            <p style={{ fontSize: '13px', color: '#86868b', margin: 0 }}>
              {confirming ? 'Revise antes de continuar' : 'Seleccione el área clínica de atención'}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: '#f5f5f7', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#86868b', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'} onMouseLeave={e => e.currentTarget.style.background = '#f5f5f7'}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '32px' }}>
          
          {!confirming ? (
            // PASO 1: SELECCIÓN
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => setConfirming('odontologia')}
                style={{
                  padding: '20px', background: 'white', border: '2px solid #e5e5e5', borderRadius: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', display: 'flex', gap: '16px', alignItems: 'flex-start'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A4E4'; e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5e5'; e.currentTarget.style.background = 'white'; }}
              >
                <div style={{ padding: '12px', background: '#e0f2fe', borderRadius: '12px', color: '#00A4E4' }}>
                  <Stethoscope size={24} />
                </div>
                <div>
                  <span style={{ color: '#1d1d1f', fontWeight: 700, fontSize: '16px', display: 'block', marginBottom: '6px' }}>Odontología General</span>
                  <p style={{ fontSize: '13px', color: '#86868b', margin: 0, lineHeight: 1.5 }}>
                    Caries y resinas • Extracciones • Limpiezas • Endodoncias
                  </p>
                </div>
              </button>

              <button
                onClick={() => setConfirming('ortodoncia')}
                style={{
                  padding: '20px', background: 'white', border: '2px solid #e5e5e5', borderRadius: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', display: 'flex', gap: '16px', alignItems: 'flex-start'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#f5f3ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5e5'; e.currentTarget.style.background = 'white'; }}
              >
                <div style={{ padding: '12px', background: '#ede9fe', borderRadius: '12px', color: '#8b5cf6' }}>
                  <Activity size={24} />
                </div>
                <div>
                  <span style={{ color: '#1d1d1f', fontWeight: 700, fontSize: '16px', display: 'block', marginBottom: '6px' }}>Ortodoncia</span>
                  <p style={{ fontSize: '13px', color: '#86868b', margin: 0, lineHeight: 1.5 }}>
                    Brackets • Arcos • Elásticos • Controles mensuales
                  </p>
                </div>
              </button>
            </div>
          ) : (
            // PASO 2: CONFIRMACIÓN PREMIUM (ADIÓS LOCALHOST DICE)
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '72px', height: '72px', margin: '0 auto 20px', 
                background: confirming === 'odontologia' ? '#e0f2fe' : '#ede9fe', 
                color: confirming === 'odontologia' ? '#00A4E4' : '#8b5cf6', 
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 16px ${confirming === 'odontologia' ? 'rgba(0,164,228,0.2)' : 'rgba(139,92,246,0.2)'}`
              }}>
                <CheckCircle2 size={36} />
              </div>
              
              <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#1d1d1f', marginBottom: '12px' }}>
                ¿Iniciar consulta de {confirming === 'odontologia' ? 'Odontología General' : 'Ortodoncia'}?
              </h4>
              
              <p style={{ fontSize: '14px', color: '#86868b', marginBottom: '32px', lineHeight: 1.5 }}>
                El expediente clínico y las herramientas especializadas se configurarán automáticamente.
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setConfirming(null)} 
                  style={{ flex: 1, padding: '14px', background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', color: '#1d1d1f', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  Volver
                </button>
                <button 
                  onClick={() => {
                    onSelect(confirming);
                    setConfirming(null);
                  }} 
                  style={{ flex: 1, padding: '14px', background: confirming === 'odontologia' ? '#00A4E4' : '#8b5cf6', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Aceptar e Iniciar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// DATOS MOCK DE CONSULTAS
// ============================================
const MOCK_CONSULTAS: Consulta[] = [
  {
    id: 'C-1001', fecha: '10/02/2026', hora: '09:30', tipo: 'odontologia', motivo: 'Dolor en muela', diagnostico: 'Caries profunda', tratamiento: 'Endodoncia parcial', doctor: 'Dra. Martínez', valor: 250000, estado: 'completada', observaciones: 'Control en 15 días'
  },
  {
    id: 'C-1002', fecha: '15/01/2026', hora: '11:00', tipo: 'ortodoncia', motivo: 'Control mensual', diagnostico: 'Evolución favorable', tratamiento: 'Ajuste de brackets', doctor: 'Dr. Rodríguez', valor: 120000, estado: 'completada'
  },
  {
    id: 'C-1003', fecha: '20/12/2025', hora: '15:30', tipo: 'odontologia', motivo: 'Limpieza', diagnostico: 'Sano', tratamiento: 'Profilaxis', doctor: 'Dra. Martínez', valor: 80000, estado: 'completada'
  }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export const PatientDashboard = () => {
  const { selectedPatient, setSelectedPatient } = usePatient();
  const navigate = useNavigate();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [consultas] = useState<Consulta[]>(MOCK_CONSULTAS);

  if (!selectedPatient) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#86868b' }}>No hay paciente seleccionado</div>;
  }

  // Estadísticas
  const totalConsultas = consultas.length;
  const totalPagado = consultas.reduce((sum, c) => sum + c.valor, 0);
  const ultimaConsulta = consultas[0]?.fecha || 'N/A';

  // ==========================================
  // HANDLER NUEVA CONSULTA (SIN ALERTAS FEAS)
  // ==========================================
  const handleNuevaConsulta = (tipo: 'odontologia' | 'ortodoncia') => {
    setModalOpen(false);
    
    // NAVEGAMOS DIRECTO, LA CONFIRMACIÓN YA SE HIZO EN EL MODAL VIP
    if (tipo === 'odontologia') {
      navigate('/consulta/general');
    } else {
      navigate('/consulta/ortodoncia');
    }
  };

  return (
    <div style={{ 
      padding: '40px', height: '100vh', background: '#fbfbfd', display: 'flex', flexDirection: 'column', overflow: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ===== HEADER CON NAVEGACIÓN ===== */}
        <div>
          <button
            onClick={() => setSelectedPatient(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', fontSize: '13px', fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A4E4'; e.currentTarget.style.color = '#00A4E4'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5e5'; e.currentTarget.style.color = '#1d1d1f'; }}
          >
            <ChevronLeft size={16} /> Volver a pacientes
          </button>
        </div>

        {/* ===== TARJETA DE INFORMACIÓN DEL PACIENTE (DISEÑO PREMIUM) ===== */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            
            {/* Info y Etiquetas */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, #00A4E4 0%, #0284c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '28px', fontWeight: 800, boxShadow: '0 8px 16px rgba(0,164,228,0.2)' }}>
                {selectedPatient.nombre[0]}{selectedPatient.apellidos[0]}
              </div>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#1d1d1f', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {selectedPatient.nombre} {selectedPatient.apellidos}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: selectedPatient.estado === 'ACTIVO' ? '#dcfce7' : '#fee2e2', color: selectedPatient.estado === 'ACTIVO' ? '#15803d' : '#b91c1c' }}>
                    {selectedPatient.estado}
                  </span>
                  <span style={{ color: '#86868b', fontSize: '13px', fontWeight: 500 }}>ID: {selectedPatient.id}</span>
                </div>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div style={{ display: 'flex', gap: '32px', padding: '16px 32px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#00A4E4' }}>{totalConsultas}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', marginTop: '2px' }}>Consultas</div>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>${totalPagado.toLocaleString()}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', marginTop: '2px' }}>Pagado</div>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#1d1d1f' }}>{ultimaConsulta}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', marginTop: '2px' }}>Última visita</div>
              </div>
            </div>
          </div>

          {/* Grid de información personal */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><User size={18} color="#86868b" /><div><div style={{ fontSize: '12px', color: '#86868b', fontWeight: 500 }}>Documento</div><div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>{selectedPatient.cc}</div></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Calendar size={18} color="#86868b" /><div><div style={{ fontSize: '12px', color: '#86868b', fontWeight: 500 }}>Nacimiento</div><div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>{selectedPatient.fechaNacimiento} ({selectedPatient.edad} años)</div></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Phone size={18} color="#86868b" /><div><div style={{ fontSize: '12px', color: '#86868b', fontWeight: 500 }}>Teléfono</div><div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>{selectedPatient.telefono}</div></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Mail size={18} color="#86868b" /><div><div style={{ fontSize: '12px', color: '#86868b', fontWeight: 500 }}>Email</div><div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>{selectedPatient.email}</div></div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><MapPin size={18} color="#86868b" /><div><div style={{ fontSize: '12px', color: '#86868b', fontWeight: 500 }}>Ciudad</div><div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>{selectedPatient.ciudad}</div></div></div>
          </div>
        </div>

        {/* ===== BOTONERA DE ACCIONES ===== */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {/* BOTÓN: Historia Clínica Inicial */}
          <button 
            onClick={() => alert("Módulo: Se abrirá el formulario de Historia Clínica Inicial (Anamnesis)")}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: '#1d1d1f', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A4E4'; e.currentTarget.style.color = '#00A4E4'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5e5'; e.currentTarget.style.color = '#1d1d1f'; }}
          >
            <ClipboardList size={18} /> Historia Clínica Inicial
          </button>

          {/* BOTÓN: Nueva Consulta */}
          <button
            onClick={() => setModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#00A4E4', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: 'white', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,164,228,0.25)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0085c0'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00A4E4'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={18} /> Nueva Consulta
          </button>
        </div>

        {/* ===== TABLA DE HISTORIAL DE CONSULTAS ===== */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#00A4E4" />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1d1d1f', margin: 0 }}>Historial Clínico de Citas</h3>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase' }}>Fecha y Hora</th>
                  <th style={{ padding: '16px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ padding: '16px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase' }}>Motivo / Diagnóstico</th>
                  <th style={{ padding: '16px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase' }}>Doctor</th>
                  <th style={{ padding: '16px 32px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((consulta) => (
                  <tr key={consulta.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontWeight: 700, color: '#1d1d1f', fontSize: '14px' }}>{consulta.fecha}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#86868b', fontSize: '12px', marginTop: '4px' }}><Clock size={12} /> {consulta.hora}</div>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <span style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: consulta.tipo === 'odontologia' ? '#e0f2fe' : '#f3e8ff', color: consulta.tipo === 'odontologia' ? '#0284c7' : '#7e22ce' }}>
                        {consulta.tipo === 'odontologia' ? 'General' : 'Ortodoncia'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1d1d1f', fontSize: '14px' }}>{consulta.motivo}</div>
                      <div style={{ color: '#86868b', fontSize: '13px', marginTop: '2px' }}>{consulta.diagnostico}</div>
                    </td>
                    <td style={{ padding: '20px 16px', fontSize: '14px', color: '#424245', fontWeight: 500 }}>{consulta.doctor}</td>
                    <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                      {consulta.estado === 'completada' ? <CheckCircle size={20} color="#10b981" /> : consulta.estado === 'cancelada' ? <XCircle size={20} color="#ef4444" /> : <AlertCircle size={20} color="#f59e0b" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Interno VIP */}
      <NuevoConsultaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSelect={handleNuevaConsulta} />
    </div>
  );
};