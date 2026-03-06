import React, { useState } from 'react';
import { Search, Plus, Download, Filter, Users } from 'lucide-react';

interface PatientRadarProps {
  onSelect: (p: any) => void;
}

const PatientRadar: React.FC<PatientRadarProps> = ({ onSelect }) => {
  const [filtroActivo, setFiltroActivo] = useState("todos");

  const directorioPacientes = [
    { id: "101", cc: "1.023.456", nombre: "PEREZ, JUAN ALBERTO", edad: 34, sangre: "O+", sexo: "M", celular: "315 482 9901", correo: "juan.perez@email.com", ciudad: "Neiva", fechaRegistro: "15/01/2025", totalCitas: 8, ultimaVisita: "10/02/2026", estado: "ACTIVO" },
    { id: "102", cc: "1.098.765", nombre: "GARCIA, MARIA HELENA", edad: 28, sangre: "A-", sexo: "F", celular: "320 845 1122", correo: "mhelenag@email.com", ciudad: "Neiva", fechaRegistro: "20/11/2025", totalCitas: 3, ultimaVisita: "01/03/2026", estado: "ACTIVO" },
    { id: "103", cc: "1.045.234", nombre: "RUIZ, CARLOS ANDRES", edad: 45, sangre: "O+", sexo: "M", celular: "310 555 7788", correo: "cruiz_88@email.com", ciudad: "Palermo", fechaRegistro: "05/03/2024", totalCitas: 15, ultimaVisita: "15/12/2025", estado: "INACTIVO" }
  ];

  return (
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
            <button className="btn-primary-estdent" style={{ padding: '10px 24px' }}>
              <Plus size={16} /> NUEVO PACIENTE
            </button>
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS Y FILTROS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px' }}>
          <div className="search-pill-modern" style={{ width: '450px', margin: 0 }}>
            <Search size={16} color="#94a3b8" />
            <input type="text" placeholder="Buscar por CC, Nombre, Celular o Correo..." />
          </div>

          <div className="filter-pills">
            <button 
              className={filtroActivo === "todos" ? "active" : ""} 
              onClick={() => setFiltroActivo("todos")}
            >
              Todos
            </button>
            <button 
              className={filtroActivo === "activos" ? "active" : ""} 
              onClick={() => setFiltroActivo("activos")}
            >
              Activos
            </button>
            <button 
              className={filtroActivo === "inactivos" ? "active" : ""} 
              onClick={() => setFiltroActivo("inactivos")}
            >
              Inactivos
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA DE LA TABLA (Con estilo minimalista) */}
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
                {directorioPacientes.map((p) => (
                  <tr key={p.id} className="row-hover cursor-pointer" onClick={() => onSelect(p)}>
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
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientRadar;