import { Home, Users, Calendar, Package, Settings, ChevronLeft } from 'lucide-react';
import { usePatient } from '../../core/context/PatientContext';

const BLUE = '#38bdf8';
const EXPANDED_WIDTH = 252;
const EDGE_REVEAL = 16;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { currentView, setCurrentView } = usePatient();

  const menuItems = [
    { id: 'inicio', label: 'Dashboard', icon: Home },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'ajustes', label: 'Configuración', icon: Settings },
  ];

  const handleCollapsedClick = () => {
    if (!collapsed) return;
    onToggle();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .sb-root {
          width: ${EXPANDED_WIDTH}px;
          height: calc(100vh - 40px);
          position: fixed;
          top: 20px;
          left: 0;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #ffffff;
          border-radius: 0 24px 24px 0;
          box-shadow:
            0 4px 12px rgba(15,23,42,0.06),
            0 18px 42px rgba(15,23,42,0.12),
            0 28px 64px -18px rgba(56,189,248,0.18),
            inset 0 1px 0 rgba(255,255,255,0.92);
          overflow: hidden;
          transform-origin: left center;
          transition:
            transform .2s cubic-bezier(0.2,0.8,0.2,1),
            box-shadow .16s ease,
            border-radius .16s ease;
          will-change: transform;
          backface-visibility: hidden;
          isolation: isolate;
        }

        .sb-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 18%, rgba(255,255,255,0.92), rgba(255,255,255,0) 38%),
            linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
          pointer-events: none;
          opacity: 0.95;
          transition: opacity .12s ease;
        }

        .sb-root.expanded {
          transform: translate3d(20px, 0, 0);
        }

        .sb-root.collapsed {
          transform: translate3d(calc(-100% + ${EDGE_REVEAL}px), 0, 0);
          background: #ffffff;
          border-right: 1px solid rgba(255,255,255,0.98);
          box-shadow:
            18px 0 30px -22px rgba(15,23,42,0.28),
            6px 0 12px -12px rgba(255,255,255,0.94),
            inset -1px 0 0 rgba(255,255,255,0.95);
          cursor: pointer;
        }

        .sb-root.collapsed::before {
          opacity: 0.72;
        }

        .sb-edge-hint {
          display: none;
        }

        .sb-root.collapsed .sb-edge-hint {
          display: block;
          position: absolute;
          top: 0;
          right: 0;
          width: ${EDGE_REVEAL}px;
          height: 100%;
          z-index: 3;
          pointer-events: none;
          background: rgba(255,255,255,0.97);
          box-shadow:
            -8px 0 14px -14px rgba(15,23,42,0.24),
            inset 1px 0 0 rgba(255,255,255,0.96);
          transition: box-shadow .16s ease, opacity .12s ease;
        }

        .sb-root.collapsed .sb-edge-hint::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.72) 50%, rgba(255,255,255,0.0));
          opacity: 0.42;
        }

        .sb-root.collapsed .sb-edge-hint::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 92px;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          background: rgba(71,85,105,0.88);
          opacity: 1;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.14);
          transition: opacity .12s ease;
        }

        .sb-toggle {
          position: absolute;
          top: 16px;
          right: 14px;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(203,213,225,0.9);
          background: rgba(255,255,255,0.92);
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 3;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease, opacity .18s ease;
          box-shadow: 0 8px 20px rgba(15,23,42,0.08);
        }

        .sb-toggle:hover {
          transform: translateY(-1px) scale(1.04);
          background: #ffffff;
          box-shadow: 0 12px 24px rgba(15,23,42,0.12);
        }

        .sb-root.collapsed .sb-toggle {
          display: none;
        }

        .sb-shell {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          z-index: 1;
          opacity: 1;
          visibility: visible;
          transition:
            opacity .08s ease .04s,
            transform .12s cubic-bezier(0.2,0.8,0.2,1) .04s,
            visibility 0s linear .04s;
        }

        .sb-root.expanded .sb-shell {
          opacity: 1;
          visibility: visible;
          transform: translateX(0) scale(1);
        }

        .sb-root.collapsed .sb-shell {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateX(-12px);
          transition:
            opacity .04s ease,
            transform .08s cubic-bezier(0.4,0,1,1),
            visibility 0s linear .04s;
        }

        .sb-header {
          padding: 30px 22px 24px;
          border-bottom: 1px solid #f1f3f5;
        }

        .sb-logo {
          font-size: 26px;
          font-weight: 900;
          color: ${BLUE};
          letter-spacing: -0.05em;
          line-height: 1;
          user-select: none;
        }

        .sb-logo span {
          color: #94a3b8;
          font-weight: 400;
        }

        .sb-logo-sub {
          font-size: 9px;
          font-weight: 600;
          color: #b0b8c4;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 6px;
        }

        .sb-section-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #c1c9d4;
          padding: 20px 22px 10px;
          margin: 0;
        }

        .sb-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 10px;
          flex: 1;
        }

        .sb-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 14px;
          border: none;
          background: transparent;
          color: #4b5563;
          border-radius: 14px;
          cursor: pointer;
          font-size: 13.5px;
          font-weight: 500;
          font-family: inherit;
          text-align: left;
          width: 100%;
          transition: background 0.14s ease, color 0.14s ease, transform 0.16s cubic-bezier(0.22,1,0.36,1);
          opacity: 0;
          animation: sbIn 0.22s cubic-bezier(0.22,1,0.36,1) both;
        }

        @keyframes sbIn {
          from { opacity: 0; transform: translateX(-14px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .sb-item:hover:not(.active) {
          background: #f3f4f6;
          color: #111827;
          transform: translateX(4px);
        }

        .sb-item.active {
          background: linear-gradient(135deg, ${BLUE} 0%, #23a7ea 100%);
          color: #ffffff;
          font-weight: 600;
          border-radius: 14px;
          box-shadow: 0 8px 18px rgba(22,156,216,0.34);
          transform: none;
        }

        .sb-icon-chip {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }

        .sb-item:hover:not(.active) .sb-icon-chip {
          transform: scale(1.12) rotate(-3deg);
        }

        .sb-item:not(.active) .sb-icon-chip {
          background: #f3f4f6;
        }

        .sb-item.active .sb-icon-chip {
          background: rgba(255,255,255,0.22);
        }

        .sb-footer {
          padding: 16px 22px 20px;
          border-top: 1px solid #f1f3f5;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sb-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10d9a0;
          flex-shrink: 0;
          position: relative;
        }

        .sb-pulse::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(16,217,160,0.22);
          animation: sbPulse 2.2s ease-in-out infinite;
        }

        @keyframes sbPulse {
          0%,100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.9); opacity: 0; }
        }

        .sb-footer-label {
          font-size: 11px;
          color: #9aa3af;
          font-weight: 500;
        }

        .sb-footer-ver {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          color: #c8d0da;
          letter-spacing: 0.04em;
          background: #f5f7f9;
          padding: 2px 7px;
          border-radius: 6px;
        }
      `}</style>

      <aside
        className={`sb-root ${collapsed ? 'collapsed' : 'expanded'}`}
        onClick={handleCollapsedClick}
        aria-label={collapsed ? 'Mostrar menu lateral' : undefined}
      >
        <div className="sb-edge-hint" />

        <button
          type="button"
          className="sb-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Encoger menu lateral'}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="sb-shell">
          <div className="sb-header">
            <div className="sb-logo">Est<span>Dent</span></div>
            <div className="sb-logo-sub">Clinical System</div>
          </div>

          <p className="sb-section-label">Menú Principal</p>

          <nav className="sb-nav">
            {menuItems.map(({ id, label, icon: Icon }, index) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  onClick={() => setCurrentView(id)}
                  className={`sb-item${isActive ? ' active' : ''}`}
                  style={{ animationDelay: `${index * 0.07}s` }}
                >
                  <div className="sb-icon-chip">
                    <Icon
                      size={16}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      color={isActive ? '#ffffff' : '#6b7280'}
                    />
                  </div>
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="sb-footer">
            <div className="sb-pulse" />
            <span className="sb-footer-label">Sistema activo</span>
            <span className="sb-footer-ver">v2.1</span>
          </div>
        </div>
      </aside>
    </>
  );
};

