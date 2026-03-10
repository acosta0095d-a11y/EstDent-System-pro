import { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, X, CalendarDays, ClipboardList, Wallet, 
  Phone, Mail, Droplet, AlertTriangle, PlayCircle, Syringe, Activity, Microscope
} from 'lucide-react';
import { usePatient } from '../../context/PatientContext';
import EntornoGeneral from './EntornoGeneral';

const PatientDashboard = () => {
  const [pestanaActiva, setPestanaActiva] = useState("historial");
  
  // Estados para el flujo de consulta
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [moduloSeleccionado, setModuloSeleccionado] = useState("");
  const [mostrarEntorno, setMostrarEntorno] = useState(false); 

  const { selectedPatient: paciente, setSelectedPatient } = usePatient();

  if (!paciente) return <div style={{padding: '50px', textAlign: 'center', fontWeight: 'bold'}}>Cargando paciente...</div>;

  const infoRapida = {
    sangre: paciente.sangre || "O+",
    alergias: "Ninguna",
    telefono: paciente.celular || "Sin registrar",
    correo: paciente.correo || "Sin registrar"
  };

  // Función para obtener los textos dinámicos y LOS TONOS DE AZUL
  const getDetallesConfirmacion = () => {
    switch(moduloSeleccionado) {
      case "Ortodoncia":
        return {
          titulo: "¿Iniciar Caso de Ortodoncia?",
          color: "#0284c7", // Azul Cielo / Celeste Profundo
          icono: <Microscope size={35} color="white" />,
          desc1: "Se habilitará el registro de controles y evolución de brackets.",
          desc2: "Se abrirá la ficha de plan de tratamiento ortodóntico."
        };
      case "Cirugía":
        return {
          titulo: "¿Iniciar Procedimiento Quirúrgico?",
          color: "#1e40af", // Azul Marino / Navy oscuro
          icono: <Syringe size={35} color="white" />,
          desc1: "Se habilitará el entorno seguro para procedimientos invasivos.",
          desc2: "Registro de extracciones, implantes y notas post-operatorias."
        };
      default:
        return {
          titulo: "¿Iniciar Valoración General?",
          color: "var(--brand-blue)", // Azul Corporativo (El principal)
          icono: <Activity size={35} color="white" />,
          desc1: "Se habilitará el odontograma técnico completo.",
          desc2: "Registro de hallazgos, caries, resinas y procedimientos base."
        };
    }
  };

  const detalles = getDetallesConfirmacion();

  return (
    <div className="dashboard-premium-container slide-in-bottom">
      
      {/* 1. ALERTA: SELECCIÓN DIRECTA EN LISTA VERTICAL */}
      {mostrarSelector && (
        <div className="modal-overlay fade-in" style={{ zIndex: 11000, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-content-pro scale-up" style={{ width: '90%', maxWidth: '550px', background: 'white', borderRadius: '24px', padding: '0', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            <div style={{ padding: '30px 30px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Iniciar Sesión Clínica</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '5px' }}>Seleccione el área para <strong>{paciente.nombre}</strong></p>
              </div>
              <button onClick={() => setMostrarSelector(false)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: '20px 30px 30px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Opción GENERAL (Azul Claro) */}
              <div 
                className="card-premium shadow-hover" 
                onClick={() => { setModuloSeleccionado("Odontología General"); setMostrarSelector(false); setMostrarConfirmacion(true); }}
                style={{ display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '12px', marginRight: '20px' }}>
                  <Activity color="var(--brand-blue)" size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 900, fontSize: '16px', color: '#1e293b' }}>Odontología General</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Valoración, odontograma y procedimientos base.</span>
                </div>
                <ChevronRight size={20} color="#cbd5e1" />
              </div>

              {/* Opción ORTODONCIA (Azul Cielo) */}
              <div 
                className="card-premium shadow-hover" 
                onClick={() => { setModuloSeleccionado("Ortodoncia"); setMostrarSelector(false); setMostrarConfirmacion(true); }}
                style={{ display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '12px', marginRight: '20px' }}>
                  <Microscope color="#0284c7" size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 900, fontSize: '16px', color: '#1e293b' }}>Ortodoncia</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Controles, brackets y evolución de ortodoncia.</span>
                </div>
                <ChevronRight size={20} color="#cbd5e1" />
              </div>

              {/* Opción CIRUGÍA (Azul Marino) */}
              <div 
                className="card-premium shadow-hover" 
                onClick={() => { setModuloSeleccionado("Cirugía"); setMostrarSelector(false); setMostrarConfirmacion(true); }}
                style={{ display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div style={{ background: '#dbeafe', padding: '15px', borderRadius: '12px', marginRight: '20px' }}>
                  <Syringe color="#1e40af" size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 900, fontSize: '16px', color: '#1e293b' }}>Cirugía</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Extracciones, implantes y procedimientos quirúrgicos.</span>
                </div>
                <ChevronRight size={20} color="#cbd5e1" />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 2. ALERTA DE CONFIRMACIÓN DINÁMICA (EN TONOS AZULES) */}
      {mostrarConfirmacion && (
        <div className="modal-overlay fade-in" style={{ zIndex: 11000, background: 'rgba(248, 250, 252, 0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="modal-content-pro scale-up" style={{ maxWidth: '550px', padding: '0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.12)', border: '1px solid white' }}>
            
            {/* Cabecera dinámica según módulo (Ahora solo en azules) */}
            <div style={{ background: detalles.color, padding: '35px 30px', textAlign: 'center', transition: 'all 0.3s ease' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                {detalles.icono}
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'white', margin: 0 }}>{detalles.titulo}</h2>
            </div>

            <div style={{ padding: '40px 30px', textAlign: 'center', background: 'white' }}>
              <p style={{ fontSize: '16px', color: '#475569', marginBottom: '15px', lineHeight: '1.6' }}>
                Estás a punto de abrir el expediente de {moduloSeleccionado} para <strong>{paciente.nombre}</strong>.
              </p>
              
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '35px', display: 'inline-block', textAlign: 'left' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>{detalles.desc1}</li>
                  <li>{detalles.desc2}</li>
                  <li>La cita quedará "En Curso" en la agenda diaria.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button 
                  className="btn-outline-pro" 
                  onClick={() => { setMostrarConfirmacion(false); setMostrarSelector(true); }} 
                  style={{ flex: 1, padding: '16px', fontSize: '15px', fontWeight: 800 }}
                >
                  Volver a opciones
                </button>
                <button 
                  className="btn-primary-estdent" 
                  onClick={() => { setMostrarConfirmacion(false); setMostrarEntorno(true); }} 
                  style={{ flex: 1, padding: '16px', fontSize: '15px', fontWeight: 900, background: detalles.color, border: 'none', boxShadow: `0 10px 20px ${detalles.color}40` }}
                >
                  SÍ, INICIAR AHORA
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

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

            {/* BOTÓN GIGANTE */}
            <button 
              className="btn-primary-estdent hover:scale-105 active:scale-95" 
              style={{
                padding: '16px 30px', fontSize: '15px', fontWeight: 900, transition: 'all 0.3s ease',
                boxShadow: '0 10px 25px rgba(0, 164, 228, 0.4)'
              }}
              onClick={() => setMostrarSelector(true)}
            >
              <PlayCircle size={22} style={{marginRight: '8px'}} /> INICIAR ATENCIÓN CLÍNICA
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

        {pestanaActiva === "historia_clinica" && (
           <div className="card-premium fade-in">
              <h2 className="workspace-title">HISTORIA CLÍNICA COMPLETA</h2>
              <p style={{color: '#64748b'}}>Datos demográficos, antecedentes y registro legal del paciente.</p>
           </div>
        )}

        {pestanaActiva === "finanzas" && (
           <div className="card-premium fade-in">
              <h2 className="workspace-title">ESTADO DE CUENTA</h2>
              <p style={{color: '#64748b'}}>Balances, abonos y deudas pendientes.</p>
           </div>
        )}

      </div>

      {/* =======================================================
          OVERLAY DEL ENTORNO GIGANTE (Entorno Clínico)
          ======================================================= */}
      {mostrarEntorno && (
        <EntornoGeneral onExit={() => setMostrarEntorno(false)} />
      )}
      
    </div>
  );
};

export default PatientDashboard;