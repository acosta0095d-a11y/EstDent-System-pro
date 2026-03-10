import { useState } from 'react';
import { Search, Plus, Download, X } from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import type { Patient } from '../types/patient';

const PatientRadar = () => {
  // ESTADOS DEL MOTOR DE BÚSQUEDA Y UI
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- CONTROLADOR DEL MODAL
  
  // EL MOTOR GLOBAL (Ya no extraemos setCurrentView porque no lo necesitamos aquí)
  const { setSelectedPatient } = usePatient();

  // BASE DE DATOS SIMULADA
  const directorioPacientes: Patient[] = [
    { id: "101", cc: "1023456", nombre: "PEREZ, JUAN ALBERTO", edad: 34, sangre: "O+", sexo: "M", celular: "3154829901", correo: "juan.perez@email.com", ciudad: "Neiva", fechaRegistro: "15/01/2025", totalCitas: 8, ultimaVisita: "10/02/2026", estado: "ACTIVO" },
    { id: "102", cc: "1098765", nombre: "GARCIA, MARIA HELENA", edad: 28, sangre: "A-", sexo: "F", celular: "3208451122", correo: "mhelenag@email.com", ciudad: "Neiva", fechaRegistro: "20/11/2025", totalCitas: 3, ultimaVisita: "01/03/2026", estado: "ACTIVO" },
    { id: "103", cc: "1045234", nombre: "RUIZ, CARLOS ANDRES", edad: 45, sangre: "O+", sexo: "M", celular: "3105557788", correo: "cruiz_88@email.com", ciudad: "Palermo", fechaRegistro: "05/03/2024", totalCitas: 15, ultimaVisita: "15/12/2025", estado: "INACTIVO" }
  ];

  // ALGORITMO DE FILTRADO
  const pacientesFiltrados = directorioPacientes.filter((p) => {
    if (filtroActivo === "activos" && p.estado !== "ACTIVO") return false;
    if (filtroActivo === "inactivos" && p.estado !== "INACTIVO") return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchNombre = p.nombre.toLowerCase().includes(term);
      const matchCC = p.cc.includes(term);
      const matchCelular = p.celular.includes(term);
      const matchCorreo = p.correo.toLowerCase().includes(term);

      if (!matchNombre && !matchCC && !matchCelular && !matchCorreo) {
        return false;
      }
    }
    return true; 
  });

  return (
    <>
      <div className="dashboard-premium-container fade-in">
        
        {/* HEADER PREMIUM DEL DIRECTORIO */}
        <header className="header-premium" style={{ padding: '30px 30px 0' }}>
          <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
            <div>
              <h1 className="patient-name-pro">Directorio de Pacientes</h1>
              <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                Gestión centralizada del CRM Odontológico
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-outline-pro" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} /> Exportar
              </button>
              {/* BOTÓN QUE ABRE EL MODAL */}
              <button 
                className="btn-primary-estdent" 
                style={{ padding: '10px 24px' }}
                onClick={() => setIsModalOpen(true)} 
              >
                <Plus size={16} /> NUEVO PACIENTE
              </button>
            </div>
          </div>

          {/* BARRA DE HERRAMIENTAS Y FILTROS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px' }}>
            
            <div className="search-pill-modern" style={{ width: '450px', margin: 0 }}>
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Buscar por CC, Nombre, Celular o Correo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-pills">
              <button className={filtroActivo === "todos" ? "active" : ""} onClick={() => setFiltroActivo("todos")}>Todos</button>
              <button className={filtroActivo === "activos" ? "active" : ""} onClick={() => setFiltroActivo("activos")}>Activos</button>
              <button className={filtroActivo === "inactivos" ? "active" : ""} onClick={() => setFiltroActivo("inactivos")}>Inactivos</button>
            </div>
          </div>
        </header>

        {/* ÁREA DE LA TABLA */}
        <div className="workspace-premium custom-scroll">
          <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-minimal-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table-minimal" style={{ minWidth: '1300px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="text-center" style={{ width: '60px' }}>ID</th>
                    <th>CÉDULA / NIT</th>
                    <th>PACIENTE</th>
                    <th className="text-center">EDAD</th>
                    <th className="text-center">RH</th>
                    <th className="text-center">SEXO</th>
                    <th>CELULAR</th>
                    <th>CORREO ELECTRÓNICO</th>
                    <th>CIUDAD</th>
                    <th className="text-center">REGISTRO</th>
                    <th className="text-center">CITAS</th>
                    <th className="text-center">ÚLTIMA VISITA</th>
                    <th className="text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.length > 0 ? (
                    pacientesFiltrados.map((p) => (
                      <tr 
                        key={p.id} 
                        className="row-hover cursor-pointer" 
                        onClick={() => {
                          // CIRUGÍA APLICADA: Solo seleccionamos al paciente.
                          // App.tsx se encarga de mostrar el dashboard automáticamente.
                          setSelectedPatient(p); 
                        }}
                      >
                        <td className="text-center text-slate-400 font-bold" style={{ fontSize: '11px' }}>{p.id}</td>
                        <td className="text-brand-blue font-bold">{p.cc}</td>
                        <td className="font-black uppercase whitespace-nowrap text-slate-800">{p.nombre}</td>
                        <td className="text-center font-bold text-slate-600">{p.edad}</td>
                        <td className="text-center font-black text-red-500">{p.sangre}</td>
                        <td className="text-center font-bold text-slate-500">{p.sexo}</td>
                        <td className="font-mono text-slate-600 font-medium">{p.celular}</td>
                        <td className="text-slate-500 font-medium">{p.correo}</td>
                        <td className="uppercase text-slate-600 font-semibold">{p.ciudad}</td>
                        <td className="text-center font-mono text-slate-400">{p.fechaRegistro}</td>
                        <td className="text-center font-bold text-slate-700">{p.totalCitas}</td>
                        <td className="text-center font-mono text-slate-400">{p.ultimaVisita}</td>
                        <td className="text-center">
                          <span className={`tag-status ${p.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                            {p.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', padding: '50px 0', color: '#64748b', fontWeight: 600 }}>
                        No se encontraron pacientes que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL DE NUEVO PACIENTE (OVERLAY)
          ========================================== */}
      {isModalOpen && (
        <div className="modal-overlay fade-in">
          <div className="modal-content-pro modal-expanded">
            <div className="modal-header">
              <h2>Registrar Nuevo Paciente</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Columna 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Documento de Identidad</label>
                    <input type="text" className="input-main" placeholder="Ej: 1023456789" />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Nombres y Apellidos</label>
                    <input type="text" className="input-main" placeholder="Nombre completo del paciente" />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Fecha de Nacimiento</label>
                    <input type="date" className="input-main" />
                  </div>
                </div>

                {/* Columna 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Número de Celular</label>
                    <input type="text" className="input-main" placeholder="Ej: 300 123 4567" />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Correo Electrónico</label>
                    <input type="email" className="input-main" placeholder="paciente@email.com" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Grupo Sanguíneo</label>
                      <select className="input-main" style={{ appearance: 'none' }}>
                        <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                        <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>Sexo</label>
                      <select className="input-main" style={{ appearance: 'none' }}>
                        <option>M</option><option>F</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div style={{ padding: '20px 30px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn-outline-pro" 
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '12px 24px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary-estdent"
                style={{ padding: '12px 24px', fontSize: '13px' }}
                onClick={() => {
                  alert("Aquí conectaremos con Rust para guardar en la Base de Datos!");
                  setIsModalOpen(false);
                }}
              >
                Guardar Paciente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientRadar;