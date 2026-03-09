import React, { useState } from 'react';
import { 
  ChevronLeft, CalendarDays, ClipboardList, Wallet, 
  Phone, Mail, MapPin, Droplet, AlertTriangle, PlayCircle, Syringe, Activity, Microscope
} from 'lucide-react';
import { usePatient } from '../../context/PatientContext';
import EntornoGeneral from './EntornoGeneral';

const PatientDashboard = () => {
  // Pestaña activa del historial/finanzas
  const [pestanaActiva, setPestanaActiva] = useState("historial");
  // Interruptor para el entorno de trabajo real (Odontograma)
  const [mostrarEntorno, setMostrarEntorno] = useState(false); 
  
  const { selectedPatient: paciente, setSelectedPatient } = usePatient();

  if (!paciente) return <div style={{padding: '50px', textAlign: 'center', fontWeight: 'bold'}}>Cargando paciente...</div>;

  const infoRapida = {
    sangre: paciente.sangre || "O+",
    alergias: "Ninguna",
    telefono: paciente.celular || "Sin registrar",
    correo: paciente.correo || "Sin registrar",
    ciudad: paciente.ciudad || "Neiva"
  };

  return (
    <div className="dashboard-premium-container slide-in-bottom">
      
      {/* HEADER PREMIUM */}
      <header className="header-premium">
        <div className="header-top-bar">
          <button className="btn-back-pro" onClick={() => setSelectedPatient(null)}>
            <ChevronLeft size={18} /> VOLVER AL DIRECTORIO
          </button>
        </div>

        <div className="header-main-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div className="patient-identity">
            <div className="avatar-pro shadow-sm">
              {paciente.nombre ? paciente.nombre.charAt(0) : "P"}
            </div>
            <div>
              <h1 className="patient-name-pro">{paciente.nombre}</h1>
              <div className="patient-tags">
                <span className="tag-cc shadow-sm">CC: {paciente.cc}</span>
                <span className={`tag-status shadow-sm ${paciente.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                  {paciente.estado}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px' }}>
            <div className="patient-quick-stats bg-slate-50/50 p-2 rounded-xl border border-slate-100 shadow-sm">
              <div className="stat-item"><Phone size={14} className="text-slate-400" /><span>{infoRapida.telefono}</span></div>
              <div className="stat-item"><Mail size={14} className="text-slate-400" /><span>{infoRapida.correo}</span></div>
              <div className="stat-divider"></div>
              <div className="stat-item text-brand-blue font-bold"><Droplet size={14} /><span>{infoRapida.sangre}</span></div>
              <div className="stat-item text-red-500 font-bold"><AlertTriangle size={14} /><span>{infoRapida.alergias}</span></div>
            </div>

            {/* BOTÓN GIGANTE: Ahora lleva al selector de módulos (Lobby) */}
            <button 
              onClick={() => setPestanaActiva("lobby_consultas")} 
              style={{
                background: 'var(--brand-blue)', color: 'white', border: 'none', borderRadius: '14px',
                padding: '18px 36px', fontSize: '16px', fontWeight: 900, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 12px 30px rgba(0, 164, 228, 0.4)', transition: 'all 0.3s ease'
              }}
              className="hover:scale-105 active:scale-95"
            >
              <PlayCircle size={24} /> INICIAR ATENCIÓN CLÍNICA
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <nav className="tabs-premium">
          <button className={`tab-btn ${pestanaActiva === "historial" ? "active" : ""}`} onClick={() => setPestanaActiva("historial")}>
            <CalendarDays size={16} /> HISTORIAL CLÍNICO
          </button>
          <button className={`tab-btn ${pestanaActiva === "historia_clinica" ? "active" : ""}`} onClick={() => setPestanaActiva("historia_clinica")}>
            <ClipboardList size={16} /> HISTORIA CLÍNICA COMPLETA
          </button>
          <button className={`tab-btn ${pestanaActiva === "finanzas" ? "active" : ""}`} onClick={() => setPestanaActiva("finanzas")}>
            <Wallet size={16} /> ESTADO DE CUENTA
          </button>
        </nav>
      </header>

      {/* ÁREA DE TRABAJO DINÁMICA */}
      <div className="workspace-premium custom-scroll" style={{ background: '#f8fafc' }}>
        
        {/* VISTA 1: TABLA DE HISTORIAL */}
        {pestanaActiva === "historial" && (
          <div className="card-premium fade-in shadow-sm border-slate-200">
            <div className="card-header-pro">
              <h2>REGISTRO DE ATENCIONES ANTERIORES</h2>
              <button className="btn-outline-pro">Imprimir Historial</button>
            </div>
            <div className="table-minimal-wrapper rounded-xl border border-slate-100 overflow-hidden">
              <table className="table-minimal">
                <thead className="bg-slate-50">
                  <tr><th>FECHA</th><th>MÓDULO</th><th>PROCEDIMIENTO REALIZADO</th><th>ESPECIALISTA</th><th className="text-right">VALOR</th></tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="font-mono text-slate-500">15/01/2026</td>
                    <td><span className="badge-outline">ODON. GENERAL</span></td>
                    <td className="font-semibold text-slate-800">Limpieza Profunda + Valoración Inicial</td>
                    <td className="text-slate-600">Dr. Sistema</td>
                    <td className="text-right font-black text-slate-800">$120.000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA 2: EL LOBBY DE SELECCIÓN (LAS 3 OPCIONES GRANDES) */}
        {pestanaActiva === "lobby_consultas" && (
          <div className="fade-in flex flex-col items-center justify-center py-10">
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>Seleccione el Entorno de Trabajo</h2>
              <p style={{ color: '#64748b', fontWeight: 600 }}>El sistema cargará las herramientas específicas según el módulo</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', maxWidth: '1100px', width: '100%', padding: '0 20px' }}>
              
              {/* OPCIÓN 1: GENERAL */}
              <div 
                className="module-card card-premium shadow-lg hover:shadow-2xl transition-all" 
                style={{ cursor: 'pointer', borderTop: '6px solid var(--brand-blue)', textAlign: 'center' }}
                onClick={() => setMostrarEntorno(true)} // <--- ESTO DISPARA EL ENTORNO (CON SU CONFIRMACIÓN)
              >
                <div style={{ background: 'var(--brand-blue-light)', color: 'var(--brand-blue)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Activity size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '12px' }}>ODONTOLOGÍA GENERAL</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Odontograma digital, resinas, profilaxis, exodoncias simples y evolución narrativa.</p>
              </div>

              {/* OPCIÓN 2: ORTODONCIA */}
              <div 
                className="module-card card-premium shadow-lg hover:shadow-2xl transition-all" 
                style={{ cursor: 'pointer', borderTop: '6px solid #8b5cf6', textAlign: 'center' }}
                onClick={() => alert("Módulo de Ortodoncia en construcción")}
              >
                <div style={{ background: '#ede9fe', color: '#8b5cf6', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Microscope size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '12px' }}>ORTODONCIA</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Control de brackets, arcos NiTi/Acero, elásticos intermaxilares y seguimiento fotográfico.</p>
              </div>

              {/* OPCIÓN 3: CIRUGÍA / IMPLANTES */}
              <div 
                className="module-card card-premium shadow-lg hover:shadow-2xl transition-all" 
                style={{ cursor: 'pointer', borderTop: '6px solid #ec4899', textAlign: 'center' }}
                onClick={() => alert("Módulo de Cirugía en construcción")}
              >
                <div style={{ background: '#fce7f3', color: '#ec4899', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Syringe size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '12px' }}>CIRUGÍA E IMPLANTES</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Planeación quirúrgica, implantes dentales, injertos y protocolos post-operatorios.</p>
              </div>

            </div>

            <button 
              className="btn-outline-pro" 
              style={{ marginTop: '50px' }}
              onClick={() => setPestanaActiva("historial")}
            >
              Cancelar y volver al historial
            </button>
          </div>
        )}

      </div>

      {/* =======================================================
          OVERLAY DEL ENTORNO GIGANTE (Aquí está la confirmación)
          ======================================================= */}
      {mostrarEntorno && (
        <EntornoGeneral onExit={() => setMostrarEntorno(false)} />
      )}
      
    </div>
  );
};

export default PatientDashboard;