import { useState } from "react"; // Necesario para la memoria interna de la vista
import { Sidebar } from "./components/Sidebar";
import "./App.css";

function App() {
  // Estado para rastrear qué pestaña está activa.
  // Empieza en "inicio".
  const [vistaActiva, setVistaActiva] = useState("inicio");

  // Función pequeña para saber qué mostrar
  const renderizarPantalla = () => {
    switch (vistaActiva) {
      case "inicio":
        return (
          <>
            <h1>Panel de Control de EstDent</h1>
            <p>Selecciona una opción en el menú izquierdo para comenzar la gestión profesional.</p>
          </>
        );
  case "pacientes":
        return (
          <div className="modern-excel-container">
            <div className="excel-header-actions">
              <div className="search-pill">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Buscar por CC o Nombre..." autoFocus />
              </div>
              <div className="header-buttons">
                <button className="btn-secondary">Exportar CSV</button>
                <button className="btn-primary-modern">+ REGISTRAR ENTRADA</button>
              </div>
            </div>
            
            <div className="spreadsheet-wrapper">
              <table className="modern-spreadsheet">
                <thead>
                  <tr>
                    <th className="cell-center">#</th>
                    <th>CÉDULA / ID</th>
                    <th>PACIENTE</th>
                    <th>MOTIVO</th>
                    <th>INGRESO</th>
                    <th>ESPERA</th>
                    <th>SALDO</th>
                    <th className="cell-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "01", cc: "1.023.456", nombre: "PEREZ, JUAN ALBERTO", motivo: "URGENCIA: DOLOR AGUDO", hora: "08:30", espera: "05m", saldo: "-50.000", status: "EMERGENCIA" },
                    { id: "02", cc: "1.098.765", nombre: "GARCIA, MARIA HELENA", motivo: "CONTROL ORTODONCIA", hora: "08:45", espera: "22m", saldo: "0", status: "NORMAL" },
                    { id: "03", cc: "1.045.234", nombre: "RUIZ, CARLOS ANDRES", motivo: "EXTRACCIÓN CORDAL", hora: "09:00", espera: "48m", saldo: "+120.000", status: "RETRASADO" },
                    { id: "04", cc: "1.055.111", nombre: "LOPEZ, DIANA MARCELA", motivo: "VALORACIÓN INICIAL", hora: "09:15", espera: "10m", saldo: "0", status: "NORMAL" },
                  ].map((p) => (
                    <tr key={p.id} className="row-hover">
                      <td className="cell-id">{p.id}</td>
                      <td className="cell-cc">{p.cc}</td>
                      <td className="cell-name">{p.nombre}</td>
                      <td className="cell-motivo">{p.motivo}</td>
                      <td className="cell-time">{p.hora}</td>
                      <td className={`cell-wait ${parseInt(p.espera) > 40 ? 'critical' : ''}`}>{p.espera}</td>
                      <td className="cell-saldo" data-type={p.saldo.startsWith('-') ? 'neg' : 'pos'}>{p.saldo}</td>
                      <td className="cell-center">
                        <span className={`pill-status ${p.status.toLowerCase()}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "agenda":
        return (
          <>
            <h1>Agenda y Citas</h1>
            <p>Aquí verás el calendario de citas.</p>
          </>
        );
      case "inventario":
        return (
          <>
            <h1>Inventario</h1>
            <p>Control de materiales, instrumental médico y pedidos.</p>
          </>
        );
      case "ajustes":
        return (
          <>
            <h1>Configuración del Sistema</h1>
            <p>Opciones de clínica, usuarios y copias de seguridad de la base de datos.</p>
          </>
        );
      default:
        return <h1>Vista no encontrada</h1>;
    }
  };

  return (
    <div className="app-layout">
      {/* Le pasamos el estado y la función para cambiar el estado al Sidebar 
        (Aún necesitamos actualizar Sidebar.tsx para que entienda esto)
      */}
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} /> 
      
      <main className="main-content">
        {/* Aquí llamamos a la función que dibuja el contenido correcto */}
        {renderizarPantalla()}
      </main>
    </div>
  );
}

export default App;