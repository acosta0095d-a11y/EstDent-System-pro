import { useState, useMemo } from 'react';
import { Patient } from '../../../core/context/PatientContext';
import { usePatient } from '../../../core/context/PatientContext';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Download,
  X,
  UserPlus,
  Calendar
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================
interface PatientBasic {
  id: string;
  cc: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  edad: number;
  telefono: string;
  email: string;
  ciudad: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimaVisita: string;
}

// ============================================
// DATOS MOCK
// ============================================
const MOCK_PATIENTS: PatientBasic[] = [
  {
    id: 'P-1001',
    cc: '1023456789',
    nombre: 'Juan',
    apellidos: 'Pérez Gómez',
    fechaNacimiento: '15/05/1991',
    edad: 34,
    telefono: '3154829901',
    email: 'juan.perez@email.com',
    ciudad: 'Bogotá',
    estado: 'ACTIVO',
    ultimaVisita: '10 feb 2026'
  },
  {
    id: 'P-1002',
    cc: '1098765432',
    nombre: 'María',
    apellidos: 'García López',
    fechaNacimiento: '22/11/1997',
    edad: 28,
    telefono: '3208451122',
    email: 'maria.garcia@email.com',
    ciudad: 'Medellín',
    estado: 'ACTIVO',
    ultimaVisita: '1 mar 2026'
  },
  {
    id: 'P-1003',
    cc: '1045236789',
    nombre: 'Carlos',
    apellidos: 'Ruiz Martínez',
    fechaNacimiento: '03/08/1980',
    edad: 45,
    telefono: '3105557788',
    email: 'carlos.ruiz@email.com',
    ciudad: 'Cali',
    estado: 'INACTIVO',
    ultimaVisita: '15 dic 2025'
  }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export const PatientRadar = () => {
  const { setSelectedPatient } = usePatient();
  
  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // ==========================================
  // FILTRADO
  // ==========================================
  const pacientesFiltrados = useMemo(() => {
    return MOCK_PATIENTS.filter(patient => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fullName = `${patient.nombre} ${patient.apellidos}`.toLowerCase();
        if (!fullName.includes(term) && 
            !patient.cc.includes(term) && 
            !patient.telefono.includes(term)) {
          return false;
        }
      }
      if (filtroCiudad !== 'todas' && patient.ciudad !== filtroCiudad) return false;
      if (filtroEstado !== 'todos' && patient.estado !== filtroEstado) return false;
      return true;
    });
  }, [searchTerm, filtroCiudad, filtroEstado]);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div style={{ 
      padding: '32px',
      height: '100%',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* ===== HEADER MINIMAL ===== */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 400,
            color: '#1d1d1f',
            letterSpacing: '-0.02em',
            marginBottom: '4px'
          }}>
            Pacientes
          </h1>
          <p style={{ color: '#86868b', fontSize: '14px', fontWeight: 400 }}>
            {pacientesFiltrados.length} registros
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
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
          >
            <Download size={16} />
            Exportar
          </button>
          
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              background: '#00A4E4',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <UserPlus size={16} />
            Nuevo
          </button>
        </div>
      </div>

      {/* ===== BARRA DE FILTROS ===== */}
      <div style={{ 
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        alignItems: 'center'
      }}>
        
        {/* Buscador */}
        <div style={{ 
          flex: 1,
          maxWidth: '400px',
          position: 'relative'
        }}>
          <Search size={16} style={{ 
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#86868b'
          }} />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 36px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={14} color="#86868b" />
            </button>
          )}
        </div>

        {/* Filtros */}
        <select
          value={filtroCiudad}
          onChange={(e) => setFiltroCiudad(e.target.value)}
          style={{
            padding: '8px 28px 8px 12px',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="todas">Todas las ciudades</option>
          <option value="Bogotá">Bogotá</option>
          <option value="Medellín">Medellín</option>
          <option value="Cali">Cali</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: '8px 28px 8px 12px',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="todos">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      {/* ===== TABLA MINIMAL (IGUAL QUE ANTES) ===== */}
      <div style={{ 
        flex: 1,
        overflow: 'auto'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ 
              color: '#86868b', 
              fontSize: '12px', 
              fontWeight: 400,
              borderBottom: '1px solid #f0f0f0'
            }}>
              <th style={{ padding: '0 12px 12px 12px', textAlign: 'left' }}>PACIENTE</th>
              <th style={{ padding: '0 12px 12px 12px', textAlign: 'left' }}>DOCUMENTO</th>
              <th style={{ padding: '0 12px 12px 12px', textAlign: 'left' }}>F. NACIMIENTO</th>
              <th style={{ padding: '0 12px 12px 12px', textAlign: 'left' }}>CONTACTO</th>
              <th style={{ padding: '0 12px 12px 12px', textAlign: 'left' }}>CIUDAD</th>
              <th style={{ padding: '0 12px 12px 12px', textAlign: 'center' }}>ESTADO</th>
              <th style={{ padding: '0 12px 12px 12px', textAlign: 'right' }}>ÚLTIMA VISITA</th>
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.map((patient) => {
              const isHovered = hoveredRow === patient.id;
              
              return (
                <tr 
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  onMouseEnter={() => setHoveredRow(patient.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    background: isHovered ? '#f5f5f5' : 'transparent', // Hover más suave
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  {/* Celda Paciente */}
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ fontWeight: 500, color: '#1d1d1f' }}>
                      {patient.nombre} {patient.apellidos}
                    </div>
                    <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>
                      {patient.edad} años
                    </div>
                  </td>
                  
                  {/* Celda Documento */}
                  <td style={{ padding: '16px 12px', color: '#424245' }}>
                    {patient.cc}
                  </td>
                  
                  {/* Celda Fecha Nacimiento */}
                  <td style={{ padding: '16px 12px', color: '#424245' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#a0a0a0" />
                      {patient.fechaNacimiento}
                    </div>
                  </td>
                  
                  {/* Celda Contacto */}
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ color: '#1d1d1f' }}>{patient.telefono}</div>
                    <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>
                      {patient.email}
                    </div>
                  </td>
                  
                  {/* Celda Ciudad */}
                  <td style={{ padding: '16px 12px', color: '#424245' }}>
                    {patient.ciudad}
                  </td>
                  
                  {/* Celda Estado - colores pastel suaves */}
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: patient.estado === 'ACTIVO' 
                        ? '#e8f5e9'
                        : '#ffebee',
                      color: patient.estado === 'ACTIVO' 
                        ? '#2e7d32'
                        : '#c62828'
                    }}>
                      {patient.estado}
                    </span>
                  </td>
                  
                  {/* Celda Última Visita */}
                  <td style={{ 
                    padding: '16px 12px', 
                    textAlign: 'right',
                    color: '#424245'
                  }}>
                    {patient.ultimaVisita}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== PAGINACIÓN MINIMAL ===== */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '24px',
        padding: '16px 0 0 0',
        borderTop: '1px solid #f0f0f0'
      }}>
        <div style={{ color: '#86868b', fontSize: '13px' }}>
          Mostrando 1-3 de 3 pacientes
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              background: 'white',
              color: '#86868b',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Anterior
          </button>
          
          <button
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #00A4E4',
              borderRadius: '6px',
              background: '#00A4E4',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            1
          </button>
          
          <button
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              background: 'white',
              color: '#86868b',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};