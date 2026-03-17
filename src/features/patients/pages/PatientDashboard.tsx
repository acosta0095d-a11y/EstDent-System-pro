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
  Download,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Activity
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
// MODAL PARA NUEVA CONSULTA
// ============================================
interface NuevoConsultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tipo: 'odontologia' | 'ortodoncia') => void;
}

const NuevoConsultaModal = ({ isOpen, onClose, onSelect }: NuevoConsultaModalProps) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '450px',
        maxWidth: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1f' }}>
            Nueva Consulta
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} color="#86868b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <p style={{ color: '#86868b', fontSize: '14px', marginBottom: '20px' }}>
            Seleccione el tipo de consulta a realizar:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => onSelect('odontologia')}
              style={{
                padding: '16px',
                background: '#f8f9fa',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 500,
                color: '#1d1d1f',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e6f7ff';
                e.currentTarget.style.borderColor = '#00A4E4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#e5e5e5';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#00A4E4" />
                <span style={{ color: '#00A4E4', fontWeight: 600 }}>Odontología General</span>
              </div>
              <p style={{ fontSize: '12px', color: '#86868b', marginTop: '8px', marginLeft: '26px' }}>
                • Caries y resinas<br />
                • Extracciones<br />
                • Limpiezas<br />
                • Endodoncias
              </p>
            </button>

            <button
              onClick={() => onSelect('ortodoncia')}
              style={{
                padding: '16px',
                background: '#f8f9fa',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 500,
                color: '#1d1d1f',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff3e0';
                e.currentTarget.style.borderColor = '#00A4E4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#e5e5e5';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#00A4E4" />
                <span style={{ color: '#00A4E4', fontWeight: 600 }}>Ortodoncia</span>
              </div>
              <p style={{ fontSize: '12px', color: '#86868b', marginTop: '8px', marginLeft: '26px' }}>
                • Brackets<br />
                • Arcos<br />
                • Elásticos<br />
                • Controles
              </p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#86868b',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancelar
          </button>
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
    id: 'C-1001',
    fecha: '10/02/2026',
    hora: '09:30',
    tipo: 'odontologia',
    motivo: 'Dolor en muela',
    diagnostico: 'Caries profunda',
    tratamiento: 'Endodoncia parcial',
    doctor: 'Dra. Martínez',
    valor: 250000,
    estado: 'completada',
    observaciones: 'Control en 15 días'
  },
  {
    id: 'C-1002',
    fecha: '15/01/2026',
    hora: '11:00',
    tipo: 'ortodoncia',
    motivo: 'Control mensual',
    diagnostico: 'Evolución favorable',
    tratamiento: 'Ajuste de brackets',
    doctor: 'Dr. Rodríguez',
    valor: 120000,
    estado: 'completada'
  },
  {
    id: 'C-1003',
    fecha: '20/12/2025',
    hora: '15:30',
    tipo: 'odontologia',
    motivo: 'Limpieza',
    diagnostico: 'Sano',
    tratamiento: 'Profilaxis',
    doctor: 'Dra. Martínez',
    valor: 80000,
    estado: 'completada'
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
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#86868b' 
      }}>
        No hay paciente seleccionado
      </div>
    );
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================
  const totalConsultas = consultas.length;
  const totalPagado = consultas.reduce((sum, c) => sum + c.valor, 0);
  const ultimaConsulta = consultas[0]?.fecha || 'N/A';

  // ==========================================
  // HANDLER NUEVA CONSULTA
  // ==========================================
  const handleNuevaConsulta = (tipo: 'odontologia' | 'ortodoncia') => {
    setModalOpen(false);
    
    const confirmar = window.confirm(`¿Iniciar consulta de ${tipo === 'odontologia' ? 'Odontología General' : 'Ortodoncia'}?`);
    
    if (confirmar) {
      if (tipo === 'odontologia') {
        navigate('/consulta/general');
      } else {
        navigate('/consulta/ortodoncia');
      }
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div style={{ 
      padding: '32px',
      height: '100%',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      
      {/* ===== HEADER CON NAVEGACIÓN ===== */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setSelectedPatient(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#1d1d1f',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
            e.currentTarget.style.borderColor = '#00A4E4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#e5e5e5';
          }}
        >
          <ChevronLeft size={16} />
          Volver a pacientes
        </button>
      </div>

      {/* ===== TARJETA DE INFORMACIÓN DEL PACIENTE ===== */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#1d1d1f',
              marginBottom: '4px'
            }}>
              {selectedPatient.nombre} {selectedPatient.apellidos}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                background: selectedPatient.estado === 'ACTIVO' 
                  ? '#e8f5e9'
                  : '#ffebee',
                color: selectedPatient.estado === 'ACTIVO' 
                  ? '#2e7d32'
                  : '#c62828'
              }}>
                {selectedPatient.estado}
              </span>
              <span style={{
                color: '#86868b',
                fontSize: '14px'
              }}>
                ID: {selectedPatient.id}
              </span>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div style={{
            display: 'flex',
            gap: '24px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#00A4E4' }}>
                {totalConsultas}
              </div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>
                Consultas
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#00A4E4' }}>
                ${totalPagado.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>
                Total pagado
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#00A4E4' }}>
                {ultimaConsulta}
              </div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>
                Última visita
              </div>
            </div>
          </div>
        </div>

        {/* Grid de información personal */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '20px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={16} color="#86868b" />
            <div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>Documento</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
                {selectedPatient.cc}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={16} color="#86868b" />
            <div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>Fecha nacimiento</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
                {selectedPatient.fechaNacimiento} ({selectedPatient.edad} años)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Phone size={16} color="#86868b" />
            <div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>Teléfono</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
                {selectedPatient.telefono}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={16} color="#86868b" />
            <div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>Email</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
                {selectedPatient.email}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={16} color="#86868b" />
            <div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>Ciudad</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
                {selectedPatient.ciudad}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HISTORIAL DE CONSULTAS ===== */}
      <div style={{
        flex: 1,
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header del historial */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #f0f0f0',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#00A4E4" />
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#1d1d1f' }}>
              Historial de consultas
            </h3>
          </div>
          
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#00A4E4',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0085c0';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#00A4E4';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={14} />
            Nueva consulta
          </button>
        </div>

        {/* Modal */}
        <NuevoConsultaModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleNuevaConsulta}
        />

        {/* Tabla de consultas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>FECHA</th>
                <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>HORA</th>
                <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>TIPO</th>
                <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>MOTIVO</th>
                <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>DIAGNÓSTICO</th>
                <th style={{ padding: '16px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>DOCTOR</th>
                <th style={{ padding: '16px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>VALOR</th>
                <th style={{ padding: '16px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 400, color: '#86868b' }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {consultas.map((consulta) => (
                <tr 
                  key={consulta.id}
                  style={{ 
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 8px', fontSize: '14px', color: '#1d1d1f' }}>{consulta.fecha}</td>
                  <td style={{ padding: '16px 8px', fontSize: '14px', color: '#1d1d1f' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="#86868b" />
                      {consulta.hora}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: consulta.tipo === 'odontologia' ? '#e8f5e9' : '#fff3e0',
                      color: consulta.tipo === 'odontologia' ? '#2e7d32' : '#ef6c00'
                    }}>
                      {consulta.tipo === 'odontologia' ? 'Odontología' : 'Ortodoncia'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 8px', fontSize: '14px', color: '#424245' }}>{consulta.motivo}</td>
                  <td style={{ padding: '16px 8px', fontSize: '14px', color: '#424245' }}>{consulta.diagnostico}</td>
                  <td style={{ padding: '16px 8px', fontSize: '14px', color: '#424245' }}>{consulta.doctor}</td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: '#1d1d1f' }}>
                    ${consulta.valor.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                    {consulta.estado === 'completada' ? (
                      <CheckCircle size={16} color="#2e7d32" />
                    ) : consulta.estado === 'cancelada' ? (
                      <XCircle size={16} color="#c62828" />
                    ) : (
                      <AlertCircle size={16} color="#ef6c00" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};