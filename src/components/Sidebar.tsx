import logoIcon from "../assets/logo.png"; // Usamos el nombre correcto del archivo

export function Sidebar({ vistaActiva, setVistaActiva }: any) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        {/* Aquí ya debería cargar tu logo correctamente */}
        <img src={logoIcon} alt="EstDent Logo" style={{ height: '32px', width: 'auto' }} />
        <h2><span>EstDent</span> Pro</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li 
            className={vistaActiva === "inicio" ? "active" : ""} 
            onClick={() => setVistaActiva("inicio")}
          >
            Inicio
          </li>
          <li 
            className={vistaActiva === "pacientes" ? "active" : ""} 
            onClick={() => setVistaActiva("pacientes")}
          >
            Pacientes
          </li>
          <li 
            className={vistaActiva === "agenda" ? "active" : ""} 
            onClick={() => setVistaActiva("agenda")}
          >
            Agenda
          </li>
          <li 
            className={vistaActiva === "inventario" ? "active" : ""} 
            onClick={() => setVistaActiva("inventario")}
          >
            Inventario
          </li>
          <li 
            className={vistaActiva === "ajustes" ? "active" : ""} 
            onClick={() => setVistaActiva("ajustes")}
          >
            Ajustes
          </li>
        </ul>
      </nav>
    </div>
  );
}