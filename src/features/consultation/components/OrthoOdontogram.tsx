import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  Activity, X, Circle, Square, Triangle, Zap, Bone,
  CheckCircle, AlertCircle, FileText, Trash, RefreshCw,
  Info, Brush, Link, LayoutGrid, AlertTriangle, MousePointer2, 
  MinusCircle, Undo, Redo, PieChart, Layers, ClipboardList
} from 'lucide-react';

// ============================================
// 1. CONFIGURACIÓN CLÍNICA ORTODONCIA
// ============================================

const COLORS = {
  instalado: '#10b981', despegado: '#ef4444', fracturado: '#f59e0b', planificado: '#3b82f6',
  retirado: '#94a3b8', ausente: '#cbd5e1', healthy: '#ffffff',
  primary: '#00A4E4', primaryLight: '#e0f2fe', primaryDark: '#0284c7',
  text: '#0f172a', textLight: '#64748b', border: '#cbd5e1', background: '#f8fafc'
};

const STATES = [
  { id: 'instalado', name: 'Instalar / Ok', color: COLORS.instalado, icon: CheckCircle },
  { id: 'despegado', name: 'Despegado', color: COLORS.despegado, icon: AlertCircle },
  { id: 'fracturado', name: 'Fracturado', color: COLORS.fracturado, icon: Zap },
  { id: 'planificado', name: 'Planificar', color: COLORS.planificado, icon: FileText },
  { id: 'retirado', name: 'Borrador', color: COLORS.retirado, icon: MinusCircle }
];

const CLINICAL_TOOLS = [
  { id: 'bracket_metal', name: 'Bracket Metálico', icon: Square, type: 'base', color: '#64748b', category: 'Base' },
  { id: 'bracket_zafiro', name: 'Bracket Estético', icon: Square, type: 'base', color: '#38bdf8', category: 'Base' },
  { id: 'bracket_autoligable', name: 'Autoligable', icon: Square, type: 'base', color: '#818cf8', category: 'Base' },
  { id: 'tubo', name: 'Tubo Molar', icon: Circle, type: 'base', color: '#f59e0b', category: 'Base' },
  { id: 'banda', name: 'Banda Ortodóntica', icon: Circle, type: 'base', color: '#f97316', category: 'Base' },
  { id: 'modulo', name: 'Módulo (Caucho)', icon: Circle, type: 'auxiliar', color: '#ec4899', category: 'Auxiliares' },
  { id: 'ligadura_metalica', name: 'Ligadura Metálica', icon: X, type: 'auxiliar', color: '#94a3b8', category: 'Auxiliares' },
  { id: 'boton', name: 'Botón', icon: Circle, type: 'auxiliar', color: '#10b981', category: 'Auxiliares' },
  { id: 'bite_turbo', name: 'Bite Turbo', icon: Triangle, type: 'auxiliar', color: '#eab308', category: 'Auxiliares' },
  { id: 'arco_niti', name: 'Arco NiTi', icon: Link, type: 'conexion', color: '#3b82f6', category: 'Sistemas' },
  { id: 'arco_acero', name: 'Arco Acero', icon: Link, type: 'conexion', color: '#475569', category: 'Sistemas' },
  { id: 'cadeneta', name: 'Cadeneta', icon: Link, type: 'conexion', color: '#a855f7', category: 'Sistemas' },
  { id: 'resorte', name: 'Resorte (Coil)', icon: Link, type: 'conexion', color: '#94a3b8', category: 'Sistemas' },
  { id: 'ausente', name: 'Extraído/Ausente', icon: X, type: 'estado', color: COLORS.ausente, category: 'Dental' },
];

interface OrthoTooth { number: string; ausente: boolean; base: { id: string; state: string } | null; auxiliares: Array<{ id: string; state: string }>; }
interface Connection { id: string; toolId: string; teeth: string[]; state: string; timestamp: number; }
interface HistoryState { teethData: Record<string, OrthoTooth>; connections: Connection[]; }

// ============================================
// 3. DIENTE HOLOGRÁFICO BLINDADO
// ============================================

const ToothGraphic = React.memo(({ number, data, isSelected, onMouseDown, onMouseEnter, isWireActive, isChainActive, isSpringActive }: any) => {
  const baseState = data?.base ? STATES.find(s => s.id === data.base?.state) : null;
  const toolData = data?.base ? CLINICAL_TOOLS.find(t => t.id === data.base?.id) : null;

  const hasModulo = data?.auxiliares?.find((a: any) => a.id === 'modulo');
  const hasLigadura = data?.auxiliares?.find((a: any) => a.id === 'ligadura_metalica');
  const hasBoton = data?.auxiliares?.find((a: any) => a.id === 'boton');
  const hasTope = data?.auxiliares?.find((a: any) => a.id === 'bite_turbo');

  return (
    <div 
      onMouseDown={() => onMouseDown(number)} onMouseEnter={() => onMouseEnter(number)}
      style={{ width: '44px', height: '68px', margin: '2px', position: 'relative', cursor: 'crosshair', transition: 'all 0.15s ease', transform: isSelected ? 'scale(1.15)' : 'scale(1)', zIndex: isSelected ? 20 : 1, opacity: data?.ausente ? 0.4 : 1, userSelect: 'none' }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 130" style={{ overflow: 'visible' }}>
        <defs><filter id={`shadow-${number}`}><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" /></filter></defs>
        <circle cx="50" cy="50" r="42" fill={isSelected ? COLORS.primaryLight : '#f8fafc'} stroke={isSelected ? COLORS.primary : COLORS.border} strokeWidth={isSelected ? "3" : "1"} filter={`url(#shadow-${number})`} />
        
        <g stroke={COLORS.border} strokeWidth="1" fill="white">
          <path d="M 15 15 Q 50 5 85 15 L 65 35 Q 50 30 35 35 Z" />
          <path d="M 35 65 Q 50 70 65 65 L 85 85 Q 50 95 15 85 Z" />
          <path d="M 15 15 L 35 35 Q 30 50 35 65 L 15 85 Q 5 50 15 15 Z" />
          <path d="M 85 15 L 65 35 Q 70 50 65 65 L 85 85 Q 95 50 85 15 Z" />
          <circle cx="50" cy="50" r="15" fill="#f1f5f9" />
        </g>

        {isWireActive && !data?.ausente && <line x1="-10" y1="50" x2="110" y2="50" stroke="#94a3b8" strokeWidth="4" />}
        {isChainActive && !data?.ausente && <line x1="-10" y1="50" x2="110" y2="50" stroke="#a855f7" strokeWidth="6" strokeOpacity="0.6" strokeDasharray="8 4" />}
        {isSpringActive && !data?.ausente && <path d="M -10 50 Q 0 40 10 50 T 30 50 T 50 50 T 70 50 T 90 50 T 110 50" fill="none" stroke="#64748b" strokeWidth="4" />}

        {data?.base && !data?.ausente && (
          <g transform="translate(35, 35)">
            {toolData?.id === 'tubo' || toolData?.id === 'banda' ? (
              <rect width="30" height="30" rx="15" fill="white" fillOpacity="0.95" stroke={baseState?.color || COLORS.text} strokeWidth="4" />
            ) : (
              <rect width="30" height="30" rx="4" fill="white" fillOpacity="0.95" stroke={baseState?.color || COLORS.text} strokeWidth="3" />
            )}
            <line x1="0" y1="15" x2="30" y2="15" stroke={baseState?.color || COLORS.text} strokeWidth="2" strokeOpacity="0.5" />
            <line x1="15" y1="0" x2="15" y2="30" stroke={baseState?.color || COLORS.text} strokeWidth="2" strokeOpacity="0.5" />
          </g>
        )}

        {!data?.ausente && (
          <g>
            {hasModulo && <circle cx="50" cy="50" r="22" fill="none" stroke={STATES.find(s=>s.id === hasModulo.state)?.color || '#ec4899'} strokeWidth="4" opacity="0.8" />}
            {hasLigadura && <g stroke={STATES.find(s=>s.id === hasLigadura.state)?.color || '#94a3b8'} strokeWidth="3"><line x1="32" y1="32" x2="68" y2="68" /><line x1="68" y1="32" x2="32" y2="68" /></g>}
            {hasBoton && <circle cx="50" cy="78" r="7" fill={STATES.find(s=>s.id === hasBoton.state)?.color || '#10b981'} />}
            {hasTope && <polygon points="50,15 60,28 40,28" fill={STATES.find(s=>s.id === hasTope.state)?.color || '#eab308'} />}
          </g>
        )}

        {data?.ausente && (
          <g transform="translate(50, 50)">
            <line x1="-30" y1="-30" x2="30" y2="30" stroke={COLORS.error} strokeWidth="6" strokeLinecap="round" />
            <line x1="30" y1="-30" x2="-30" y2="30" stroke={COLORS.error} strokeWidth="6" strokeLinecap="round" />
          </g>
        )}

        <text x="50" y="115" textAnchor="middle" fontSize="18" fontWeight="800" fill={isSelected ? COLORS.primaryDark : COLORS.textLight}>{number}</text>
      </svg>
    </div>
  );
});

// ============================================
// 4. COMPONENTE PRINCIPAL (MOTOR Y DASHBOARD DETALLADO)
// ============================================

export const OrthoOdontogram = ({ onUpdate }: any) => {
  const [activeState, setActiveState] = useState(STATES[0].id);
  const [activeTool, setActiveTool] = useState(CLINICAL_TOOLS[0].id);
  
  const [teethData, setTeethData] = useState<Record<string, OrthoTooth>>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const [history, setHistory] = useState<HistoryState[]>([{ teethData: {}, connections: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const upperTeeth = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  const lowerTeeth = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];

  const getTooth = useCallback((num: string, data = teethData): OrthoTooth => {
    return data[num] || { number: num, ausente: false, base: null, auxiliares: [] };
  }, [teethData]);

  // ============================================
  // PINTURA CONTINUA BLINDADA
  // ============================================

  const saveHistory = (newTeeth: Record<string, OrthoTooth>, newConnections: Connection[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ teethData: newTeeth, connections: newConnections });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleMouseDown = (num: string) => { setIsDragging(true); setSelectedTeeth([num]); };
  const handleMouseEnter = (num: string) => { if (isDragging && !selectedTeeth.includes(num)) setSelectedTeeth(prev => [...prev, num]); };
  
  const executePaint = (selection: string[]) => {
    if (selection.length === 0) return;
    const tool = CLINICAL_TOOLS.find(t => t.id === activeTool);
    if (!tool) return;

    let nextTeeth = { ...teethData };
    let nextConns = [...connections];

    if (tool.type === 'conexion') {
      if (activeState === 'retirado') {
        nextConns = nextConns.filter(c => !(c.toolId === tool.id && selection.some(t => c.teeth.includes(t))));
      } else {
        nextConns.push({ id: `conn-${Date.now()}`, toolId: tool.id, teeth: [...selection], state: activeState, timestamp: Date.now() });
      }
    } else if (tool.id === 'ausente') {
      selection.forEach(num => { nextTeeth[num] = { ...(nextTeeth[num] || getTooth(num)), ausente: activeState !== 'retirado' }; });
    } else {
      selection.forEach(num => {
        const current = nextTeeth[num] || getTooth(num);
        const safeAuxiliares = current.auxiliares || []; 

        if (tool.type === 'base') {
          nextTeeth[num] = { ...current, base: activeState === 'retirado' ? null : { id: tool.id, state: activeState } };
        } else if (tool.type === 'auxiliar') {
          const otras = safeAuxiliares.filter(a => a.id !== tool.id);
          nextTeeth[num] = { ...current, auxiliares: activeState === 'retirado' ? otras : [...otras, { id: tool.id, state: activeState }] };
        }
      });
    }

    setTeethData(nextTeeth); setConnections(nextConns); saveHistory(nextTeeth, nextConns);
  };

  const prevDataString = useRef("");
  useEffect(() => {
    if (!onUpdate) return;
    const currentDataString = JSON.stringify({ teethData, connections });
    if (prevDataString.current !== currentDataString) {
      prevDataString.current = currentDataString;
      const hallazgosExportar: any[] = [];
      Object.values(teethData).forEach(diente => {
        if (diente.base && (diente.base.state === 'despegado' || diente.base.state === 'fracturado')) {
          const tData = CLINICAL_TOOLS.find(t => t.id === diente.base?.id);
          hallazgosExportar.push({ id: `falla-${diente.number}`, diente: diente.number, tipo: tData?.name || 'Aparato', severidad: diente.base.state, descripcion: `Falla en pieza ${diente.number}` });
        }
      });
      connections.forEach(conn => {
        const tData = CLINICAL_TOOLS.find(t => t.id === conn.toolId);
        hallazgosExportar.push({ id: conn.id, diente: `${conn.teeth[0]} al ${conn.teeth[conn.teeth.length-1]}`, tipo: tData?.name, severidad: conn.state, descripcion: `Instalado en ${conn.teeth.length} piezas` });
      });
      onUpdate(hallazgosExportar);
    }
  }, [teethData, connections, onUpdate]);

  const handleMouseUp = () => { if (isDragging) { setIsDragging(false); executePaint(selectedTeeth); setSelectedTeeth([]); } };

  useEffect(() => {
    const handleGlobalMouseUp = () => { if (isDragging) handleMouseUp(); };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, selectedTeeth]);

  const undo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setTeethData(history[historyIndex - 1].teethData); setConnections(history[historyIndex - 1].connections); } };
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setTeethData(history[historyIndex + 1].teethData); setConnections(history[historyIndex + 1].connections); } };
  const clearAll = () => { if (window.confirm('¿Limpiar todo el esquema de ortodoncia?')) { setTeethData({}); setConnections([]); setSelectedTeeth([]); saveHistory({}, []); } };

  // ============================================
  // GENERADOR DE DATOS DETALLADOS PARA DASHBOARD
  // ============================================
  const statsDetallados = useMemo(() => {
    const fallas: any[] = [];
    const agrupadoBases: Record<string, string[]> = {};
    const agrupadoAux: Record<string, string[]> = {};
    
    let totalBases = 0;
    let totalAux = 0;

    Object.values(teethData).forEach(t => {
      if (t?.ausente) return;
      
      // Procesar Bases
      if (t?.base) {
        totalBases++;
        const tool = CLINICAL_TOOLS.find(c => c.id === t.base?.id);
        const name = tool ? tool.name : 'Base';
        if (!agrupadoBases[name]) agrupadoBases[name] = [];
        agrupadoBases[name].push(t.number);

        if (t.base.state === 'despegado' || t.base.state === 'fracturado') {
          fallas.push({ diente: t.number, tipo: name, estado: t.base.state });
        }
      }

      // Procesar Auxiliares
      if (t?.auxiliares?.length > 0) {
        t.auxiliares.forEach(aux => {
          totalAux++;
          const tool = CLINICAL_TOOLS.find(c => c.id === aux.id);
          const name = tool ? tool.name : 'Auxiliar';
          if (!agrupadoAux[name]) agrupadoAux[name] = [];
          agrupadoAux[name].push(t.number);

          if (aux.state === 'despegado' || aux.state === 'fracturado') {
            fallas.push({ diente: t.number, tipo: name, estado: aux.state });
          }
        });
      }
    });

    return { 
      totalBases, totalAux, totalFallas: fallas.length, 
      fallas, agrupadoBases, agrupadoAux, sistemas: connections 
    };
  }, [teethData, connections]);

  // UI Componente: Badge de Diente
  const ToothBadge = ({ num, isError = false }: { num: string, isError?: boolean }) => (
    <span style={{ display: 'inline-block', padding: '2px 6px', background: isError ? COLORS.errorLight : COLORS.background, color: isError ? COLORS.error : COLORS.primaryDark, border: `1px solid ${isError ? COLORS.error : COLORS.border}`, borderRadius: '6px', fontSize: '11px', fontWeight: 700, margin: '2px' }}>
      #{num}
    </span>
  );

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', width: '100%', background: 'white', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', color: COLORS.text }}>
      
      {/* BARRA SUPERIOR (ESTADOS Y DESHACER) */}
      <div style={{ padding: '20px 30px', background: '#f8fafc', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATES.map(state => (
            <button key={state.id} onClick={() => setActiveState(state.id)} style={{ padding: '8px 16px', background: activeState === state.id ? state.color : 'white', color: activeState === state.id ? 'white' : state.color, border: `2px solid ${state.color}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: activeState === state.id ? `0 2px 8px ${state.color}80` : 'none' }}>
              <state.icon size={14} /> {state.name}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'white', borderRadius: '8px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginRight: '10px' }}>
            <button onClick={undo} disabled={historyIndex === 0} style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderRight: `1px solid ${COLORS.border}`, cursor: historyIndex === 0 ? 'not-allowed' : 'pointer', opacity: historyIndex === 0 ? 0.5 : 1 }}><Undo size={16} color={COLORS.textLight} /></button>
            <button onClick={redo} disabled={historyIndex === history.length - 1} style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: historyIndex === history.length - 1 ? 'not-allowed' : 'pointer', opacity: historyIndex === history.length - 1 ? 0.5 : 1 }}><Redo size={16} color={COLORS.textLight} /></button>
          </div>
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: '#fee2e2', border: `1px solid ${COLORS.border}`, color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}><Trash size={14} /> Limpiar</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', padding: '24px' }} onMouseLeave={handleMouseUp}>
        
        {/* COLUMNA IZQUIERDA: PINCEL ACTIVO */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: COLORS.primaryLight, borderRadius: '12px', border: `2px solid ${COLORS.primary}`, padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.primaryDark, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Brush size={14} /> Pincel Activo</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.primaryDark, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {React.createElement(CLINICAL_TOOLS.find(t=>t.id === activeTool)?.icon || Square, { size: 24 })}
              {CLINICAL_TOOLS.find(t=>t.id === activeTool)?.name}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.primary, marginTop: '10px', fontWeight: 600 }}>Haz clic y arrastra sobre los dientes para pintar al instante.</div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f1f5f9', borderBottom: `1px solid ${COLORS.border}` }}><h3 style={{ fontSize: '12px', fontWeight: 800, color: COLORS.textLight, margin: 0, textTransform: 'uppercase' }}>Herramientas</h3></div>
            <div style={{ padding: '8px', maxHeight: '500px', overflowY: 'auto' }}>
              {CLINICAL_TOOLS.map(tool => (
                <button
                  key={tool.id} onClick={() => setActiveTool(tool.id)}
                  style={{ width: '100%', padding: '10px 12px', background: activeTool === tool.id ? '#f1f5f9' : 'transparent', border: activeTool === tool.id ? `1px solid ${COLORS.border}` : `1px solid transparent`, borderRadius: '8px', marginBottom: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}
                >
                  <tool.icon size={16} color={activeTool === tool.id ? COLORS.primaryDark : COLORS.textLight} />
                  <div style={{ fontWeight: 600, fontSize: '13px', color: activeTool === tool.id ? COLORS.primaryDark : COLORS.text }}>{tool.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ODONTOGRAMA Y DASHBOARD */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '50px', alignItems: 'center' }}>
            {/* Superior */}
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
              {upperTeeth.map((num, i) => (
                <React.Fragment key={num}>
                  {i === 8 && <div style={{ width: '2px', background: '#e2e8f0', margin: '0 8px' }} />}
                  <ToothGraphic number={num} data={getTooth(num)} isSelected={selectedTeeth.includes(num)} onMouseDown={handleMouseDown} onMouseEnter={handleMouseEnter} isWireActive={connections.some(c => c.toolId.includes('arco') && c.teeth.includes(num))} isChainActive={connections.some(c => c.toolId === 'cadeneta' && c.teeth.includes(num))} isSpringActive={connections.some(c => c.toolId === 'resorte' && c.teeth.includes(num))} />
                </React.Fragment>
              ))}
            </div>
            <div style={{ width: '80%', height: '1px', background: `linear-gradient(90deg, transparent, #e2e8f0, transparent)` }} />
            {/* Inferior */}
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
              {lowerTeeth.map((num, i) => (
                <React.Fragment key={num}>
                  {i === 8 && <div style={{ width: '2px', background: '#e2e8f0', margin: '0 8px' }} />}
                  <ToothGraphic number={num} data={getTooth(num)} isSelected={selectedTeeth.includes(num)} onMouseDown={handleMouseDown} onMouseEnter={handleMouseEnter} isWireActive={connections.some(c => c.toolId.includes('arco') && c.teeth.includes(num))} isChainActive={connections.some(c => c.toolId === 'cadeneta' && c.teeth.includes(num))} isSpringActive={connections.some(c => c.toolId === 'resorte' && c.teeth.includes(num))} />
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* DASHBOARD SUMMARY (4 Tarjetas) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><LayoutGrid size={24} color={COLORS.primary} /></div>
              <div><div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase' }}>Bases Instaladas</div><div style={{ fontSize: '24px', fontWeight: 900, color: COLORS.text }}>{statsDetallados.totalBases}</div></div>
            </div>
            
            <div style={{ background: statsDetallados.totalFallas > 0 ? '#fef2f2' : '#f8fafc', padding: '20px', borderRadius: '12px', border: `1px solid ${statsDetallados.totalFallas > 0 ? '#fca5a5' : COLORS.border}`, display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.3s' }}>
              <div style={{ background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><AlertTriangle size={24} color={statsDetallados.totalFallas > 0 ? COLORS.error : COLORS.textLight} /></div>
              <div><div style={{ fontSize: '11px', fontWeight: 800, color: statsDetallados.totalFallas > 0 ? COLORS.error : COLORS.textLight, textTransform: 'uppercase' }}>Fallas / Caídos</div><div style={{ fontSize: '24px', fontWeight: 900, color: statsDetallados.totalFallas > 0 ? COLORS.error : COLORS.text }}>{statsDetallados.totalFallas}</div></div>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Layers size={24} color="#ec4899" /></div>
              <div><div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase' }}>Auxiliares Activos</div><div style={{ fontSize: '24px', fontWeight: 900, color: COLORS.text }}>{statsDetallados.totalAux}</div></div>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Link size={24} color="#8b5cf6" /></div>
              <div><div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase' }}>Arcos y Sistemas</div><div style={{ fontSize: '24px', fontWeight: 900, color: COLORS.text }}>{statsDetallados.sistemas.length}</div></div>
            </div>
          </div>

          {/* DASHBOARD DETALLADO (INVENTARIO) */}
          <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ClipboardList size={18} color={COLORS.primaryDark} />
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: COLORS.text, margin: 0 }}>Desglose de Aparatología y Hallazgos</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: COLORS.border, gap: '1px' }}>
              
              {/* COLUMNA 1: APARATOLOGÍA FIJA */}
              <div style={{ background: 'white', padding: '20px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '16px' }}>Aparatología Adherida</h4>
                
                {Object.keys(statsDetallados.agrupadoBases).length === 0 && Object.keys(statsDetallados.agrupadoAux).length === 0 && (
                  <div style={{ fontSize: '13px', color: COLORS.textLight, fontStyle: 'italic' }}>No hay bases ni auxiliares registrados.</div>
                )}

                {Object.entries(statsDetallados.agrupadoBases).map(([toolName, dientes]) => (
                  <div key={toolName} style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text, marginBottom: '4px' }}>{toolName} ({dientes.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>{dientes.map(d => <ToothBadge key={d} num={d} />)}</div>
                  </div>
                ))}

                {Object.entries(statsDetallados.agrupadoAux).map(([toolName, dientes]) => (
                  <div key={toolName} style={{ marginBottom: '12px', marginTop: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ec4899', marginBottom: '4px' }}>{toolName} ({dientes.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>{dientes.map(d => <ToothBadge key={d} num={d} />)}</div>
                  </div>
                ))}
              </div>

              {/* COLUMNA 2: CONEXIONES Y FALLAS */}
              <div style={{ background: 'white', padding: '20px' }}>
                
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: COLORS.textLight, textTransform: 'uppercase', marginBottom: '16px' }}>Sistemas Activos y Novedades</h4>
                
                {statsDetallados.sistemas.length === 0 && statsDetallados.fallas.length === 0 && (
                  <div style={{ fontSize: '13px', color: COLORS.textLight, fontStyle: 'italic' }}>No hay conexiones ni fallas reportadas.</div>
                )}

                {/* Listado de Conexiones */}
                {statsDetallados.sistemas.map(sys => {
                  const tool = CLINICAL_TOOLS.find(t => t.id === sys.toolId);
                  return (
                    <div key={sys.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginBottom: '8px' }}>
                      <Link size={16} color="#8b5cf6" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text }}>{tool?.name || 'Sistema'}</div>
                        <div style={{ fontSize: '11px', color: COLORS.textLight }}>De la pieza {sys.teeth[0]} a la {sys.teeth[sys.teeth.length - 1]}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Listado de Fallas (Rojo) */}
                {statsDetallados.fallas.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.error, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> Requieren Atención</div>
                    {statsDetallados.fallas.map((f, i) => (
                      <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef2f2', border: `1px solid #fca5a5`, padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: COLORS.error, fontWeight: 600, margin: '0 4px 4px 0' }}>
                        Pieza {f.diente}: {f.tipo} ({f.estado})
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};