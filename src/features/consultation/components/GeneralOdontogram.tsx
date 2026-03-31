import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Activity, X, ChevronDown, ChevronUp,
  Circle, Square, Triangle, Zap, Bone, Crosshair,
  Droplet, Scissors, HelpCircle,
  CheckCircle, AlertCircle, FileText,
  Star, Heart, Shield, Award, Sun, Moon, Trash, RefreshCw,
  PieChart, TrendingUp, Info,
  RotateCcw, Download, Upload, Brush, Eye,
  Pen, Clock, Calendar, Filter, Grid, Layers, Palette,
  Smile, Meh, Frown, Thermometer, Pill, Syringe,
  Stethoscope, Microscope, Camera, Video, Mic,
  Music, Film, Image, Book, BookOpen, Clipboard,
  Printer, Save, Copy, Scissors as ScissorsIcon
} from 'lucide-react';

// ============================================
// 1. CONFIGURACIÓN CLÍNICA PROFESIONAL
// ============================================

const COLORS = {
  pendiente: '#ef4444',
  realizado: '#10b981',
  externo: '#0f172a',
  presupuesto: '#3b82f6',
  ausente: '#cbd5e1',
  healthy: '#ffffff',
  caries: '#ef4444',
  resina: '#3b82f6',
  endodoncia: '#8b5cf6',
  implante: '#6b7280',
  corona: '#f59e0b',
  extraccion: '#6b7280',
  sellante: '#3b82f6',
  primary: '#0071e3',
  primaryLight: '#e0f2fe',
  primaryDark: '#0284c7',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#8b5cf6',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textLight: '#64748b',
  border: '#cbd5e1'
};

const STATES = [
  { 
    id: 'pendiente', 
    name: 'Pendiente', 
    color: COLORS.pendiente, 
    description: 'Patología / Requiere atención inmediata',
    longDescription: 'Caries activas, fracturas, lesiones que necesitan tratamiento urgente. El paciente presenta dolor o riesgo de complicaciones.',
    icon: AlertCircle,
    shortcut: 'Ctrl+1',
    clinicalMeaning: 'Diagnóstico pendiente de tratamiento'
  },
  { 
    id: 'realizado', 
    name: 'Realizado', 
    color: COLORS.realizado, 
    description: 'Tratamiento completado en esta clínica',
    longDescription: 'El procedimiento fue realizado exitosamente. Queda registrado en el historial del paciente con fecha y hora.',
    icon: CheckCircle,
    shortcut: 'Ctrl+2',
    clinicalMeaning: 'Tratamiento finalizado'
  },
  { 
    id: 'externo', 
    name: 'Existente / Externo', 
    color: COLORS.externo, 
    description: 'Tratamiento realizado en otra clínica',
    longDescription: 'El paciente ya tenía este tratamiento al llegar. Se registra como trabajo externo para mantener el historial completo.',
    icon: Shield,
    shortcut: 'Ctrl+3',
    clinicalMeaning: 'Tratamiento previo de otra institución'
  },
  { 
    id: 'presupuesto', 
    name: 'Presupuesto', 
    color: COLORS.presupuesto, 
    description: 'Planificado / En espera de aprobación',
    longDescription: 'Tratamiento cotizado pero aún no realizado. Pendiente de aprobación por el paciente o de programación.',
    icon: FileText,
    shortcut: 'Ctrl+4',
    clinicalMeaning: 'En espera de autorización'
  }
];

// ============================================
// 2. HERRAMIENTAS CLÍNICAS AMPLIADAS (40+)
// ============================================

const CLINICAL_TOOLS = [
  // Diagnóstico
  { id: 'caries', name: 'Caries', icon: Circle, type: 'hallazgo', color: COLORS.caries, description: 'Lesión cariosa activa', category: 'Diagnóstico', detailed: 'Caries superficial, media o profunda' },
  { id: 'caries_profunda', name: 'Caries Profunda', icon: Circle, type: 'hallazgo', color: '#b91c1c', description: 'Caries que afecta dentina profunda', category: 'Diagnóstico' },
  { id: 'fractura', name: 'Fractura', icon: AlertCircle, type: 'hallazgo', color: '#f97316', description: 'Fractura dental', category: 'Diagnóstico' },
  { id: 'abrasion', name: 'Abrasión', icon: AlertCircle, type: 'hallazgo', color: '#94a3b8', description: 'Desgaste dental por cepillado', category: 'Diagnóstico' },
  { id: 'atricion', name: 'Atrición', icon: AlertCircle, type: 'hallazgo', color: '#94a3b8', description: 'Desgaste por bruxismo', category: 'Diagnóstico' },
  { id: 'erosion', name: 'Erosión', icon: AlertCircle, type: 'hallazgo', color: '#94a3b8', description: 'Pérdida de esmalte por ácidos', category: 'Diagnóstico' },
  
  // Tratamientos Básicos
  { id: 'resina', name: 'Resina', icon: Square, type: 'tratamiento', color: COLORS.resina, description: 'Restauración con resina compuesta', category: 'Tratamiento' },
  { id: 'amalgama', name: 'Amalgama', icon: Square, type: 'tratamiento', color: '#6b7280', description: 'Restauración con amalgama de plata', category: 'Tratamiento' },
  { id: 'ionomero', name: 'Ionómero', icon: Square, type: 'tratamiento', color: '#94a3b8', description: 'Restauración con ionómero de vidrio', category: 'Tratamiento' },
  { id: 'incrustacion', name: 'Incrustación', icon: Square, type: 'tratamiento', color: '#f59e0b', description: 'Incrustación dental', category: 'Tratamiento' },
  
  // Endodoncia
  { id: 'endodoncia', name: 'Endodoncia', icon: Zap, type: 'tratamiento', color: COLORS.endodoncia, description: 'Tratamiento de conducto', category: 'Endodoncia' },
  { id: 'retratamiento', name: 'Retratamiento', icon: Zap, type: 'tratamiento', color: '#7c3aed', description: 'Retratamiento de conducto', category: 'Endodoncia' },
  { id: 'apicectomia', name: 'Apicectomía', icon: Zap, type: 'quirurgico', color: '#7c3aed', description: 'Cirugía apical', category: 'Quirúrgico' },
  
  // Implantes
  { id: 'implante', name: 'Implante', icon: Bone, type: 'tratamiento', color: COLORS.implante, description: 'Colocación de implante dental', category: 'Implantología' },
  { id: 'pilastra', name: 'Pilastra', icon: Bone, type: 'tratamiento', color: '#475569', description: 'Colocación de pilastra', category: 'Implantología' },
  { id: 'corona_implante', name: 'Corona/Implante', icon: Triangle, type: 'protesis', color: COLORS.corona, description: 'Corona sobre implante', category: 'Prostodoncia' },
  
  // Prótesis
  { id: 'corona', name: 'Corona', icon: Triangle, type: 'tratamiento', color: COLORS.corona, description: 'Corona dental / Funda', category: 'Prostodoncia' },
  { id: 'puente', name: 'Puente', icon: Heart, type: 'prostodoncia', color: '#84cc16', description: 'Puente dental fijo', category: 'Prostodoncia' },
  { id: 'protesis', name: 'Prótesis', icon: Award, type: 'prostodoncia', color: '#a855f7', description: 'Prótesis removible', category: 'Prostodoncia' },
  { id: 'protesis_total', name: 'Prótesis Total', icon: Award, type: 'prostodoncia', color: '#a855f7', description: 'Prótesis completa', category: 'Prostodoncia' },
  
  // Cirugía
  { id: 'extraccion', name: 'Extracción', icon: Scissors, type: 'tratamiento', color: COLORS.extraccion, description: 'Extracción dental simple', category: 'Quirúrgico' },
  { id: 'extraccion_compleja', name: 'Extracción Compleja', icon: Scissors, type: 'tratamiento', color: '#6b7280', description: 'Extracción quirúrgica', category: 'Quirúrgico' },
  { id: 'cordal', name: 'Cordal', icon: Scissors, type: 'tratamiento', color: '#6b7280', description: 'Extracción de muela del juicio', category: 'Quirúrgico' },
  { id: 'quiste', name: 'Quiste', icon: AlertCircle, type: 'quirurgico', color: '#6b7280', description: 'Eliminación de quiste', category: 'Quirúrgico' },
  
  // Ortodoncia
  { id: 'ortodoncia', name: 'Brackets', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Tratamiento de ortodoncia', category: 'Ortodoncia' },
  { id: 'brackets_metalicos', name: 'Brackets Metálicos', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Brackets metálicos convencionales', category: 'Ortodoncia' },
  { id: 'brackets_esteticos', name: 'Brackets Estéticos', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Brackets de zafiro/cerámica', category: 'Ortodoncia' },
  { id: 'brackets_autoligables', name: 'Brackets Autoligables', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Brackets autoligables', category: 'Ortodoncia' },
  { id: 'arco', name: 'Arco', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Cambio de arco', category: 'Ortodoncia' },
  { id: 'elasticos', name: 'Elásticos', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Elásticos intermaxilares', category: 'Ortodoncia' },
  
  // Estética
  { id: 'blanqueamiento', name: 'Blanqueamiento', icon: Sun, type: 'estético', color: '#f97316', description: 'Blanqueamiento dental', category: 'Estética' },
  { id: 'carillas', name: 'Carillas', icon: Eye, type: 'estético', color: '#f97316', description: 'Carillas de porcelana', category: 'Estética' },
  { id: 'contorno', name: 'Contorno Gingival', icon: Pen, type: 'estético', color: '#f97316', description: 'Recontorneo de encía', category: 'Estética' },
  
  // Preventivo
  { id: 'sellante', name: 'Sellante', icon: Droplet, type: 'preventivo', color: COLORS.sellante, description: 'Sellante de fosas y fisuras', category: 'Preventivo' },
  { id: 'fluor', name: 'Aplicación Flúor', icon: Droplet, type: 'preventivo', color: COLORS.sellante, description: 'Aplicación tópica de flúor', category: 'Preventivo' },
  { id: 'profilaxis', name: 'Profilaxis', icon: Brush, type: 'preventivo', color: COLORS.sellante, description: 'Limpieza dental', category: 'Preventivo' },
  
  // Estados
  { id: 'ausente', name: 'Ausente', icon: X, type: 'estado', color: COLORS.ausente, description: 'Diente ausente / Perdido', category: 'Estado' },
  { id: 'no_erupcionado', name: 'No Erupcionado', icon: X, type: 'estado', color: COLORS.ausente, description: 'Diente no erupcionado', category: 'Estado' },
  { id: 'retenido', name: 'Retenido', icon: X, type: 'estado', color: COLORS.ausente, description: 'Diente retenido', category: 'Estado' },
  { id: 'supernumerario', name: 'Supernumerario', icon: Star, type: 'estado', color: '#a855f7', description: 'Diente extra', category: 'Estado' }
];

const CATEGORIES = Array.from(new Set(CLINICAL_TOOLS.map(t => t.category)));

// ============================================
// 3. TIPOS DE DATOS
// ============================================

interface FaceData {
  oclusal: string;
  vestibular: string;
  lingual: string;
  mesial: string;
  distal: string;
}

interface ToothData {
  number: string;
  faces: FaceData;
  ausente: boolean;
  marks: Array<{
    face: string;
    tool: string;
    state: string;
    timestamp: number;
  }>;
  notes?: string;
}

interface ToothProps {
  number: string;
  faces: FaceData;
  ausente?: boolean;
  onFaceClick: (face: string) => void;
  hasMark?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

// ============================================
// 4. COMPONENTE DIENTE MEJORADO
// ============================================

const ToothGraphic = React.memo(({ number, faces, ausente, onFaceClick, hasMark, isSelected, onSelect }: ToothProps) => {
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const getFaceColor = (face: string, baseColor: string) => {
    if (hoveredFace === face && baseColor === COLORS.healthy) return COLORS.primaryLight;
    if (hoveredFace === face) return baseColor; 
    return baseColor;
  };

  const paths = {
    vestibular: "M 15 15 Q 50 5 85 15 L 65 35 Q 50 30 35 35 Z",
    lingual: "M 35 65 Q 50 70 65 65 L 85 85 Q 50 95 15 85 Z",
    mesial: "M 15 15 L 35 35 Q 30 50 35 65 L 15 85 Q 5 50 15 15 Z",
    distal: "M 85 15 L 65 35 Q 70 50 65 65 L 85 85 Q 95 50 85 15 Z",
    oclusal: "M 35 35 Q 50 30 65 35 Q 70 50 65 65 Q 50 70 35 65 Q 30 50 35 35 Z"
  };

  return (
    <div 
      onClick={onSelect}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        width: '44px',
        height: '68px',
        margin: '2px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
        zIndex: isSelected ? 20 : 1,
        opacity: ausente ? 0.4 : 1,
        filter: isSelected ? 'drop-shadow(0 4px 8px rgba(0,164,228,0.3))' : (ausente ? 'grayscale(100%)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))'),
      }}
      className="tooth-container hover:z-20"
    >
      <svg width="100%" height="100%" viewBox="0 0 100 130" style={{ overflow: 'visible' }}>
        <defs>
          <filter id={`shadow-${number}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.1" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle cx="50" cy="50" r="42" fill={isSelected ? '#e6f7ff' : '#f8fafc'} filter={`url(#shadow-${number})`} />

        <g stroke={COLORS.border} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <path d={paths.vestibular} fill={getFaceColor('vestibular', faces.vestibular)} 
            onClick={(e) => { e.stopPropagation(); onFaceClick('vestibular'); }} 
            onMouseEnter={() => setHoveredFace('vestibular')} onMouseLeave={() => setHoveredFace(null)} 
            style={{ transition: 'fill 0.2s, opacity 0.2s', opacity: hoveredFace === 'vestibular' ? 0.8 : 1 }} 
            className={hoveredFace === 'vestibular' ? 'face-hover' : ''} />
          
          <path d={paths.mesial} fill={getFaceColor('mesial', faces.mesial)} 
            onClick={(e) => { e.stopPropagation(); onFaceClick('mesial'); }} 
            onMouseEnter={() => setHoveredFace('mesial')} onMouseLeave={() => setHoveredFace(null)} 
            style={{ transition: 'fill 0.2s, opacity 0.2s', opacity: hoveredFace === 'mesial' ? 0.8 : 1 }} />
          
          <path d={paths.distal} fill={getFaceColor('distal', faces.distal)} 
            onClick={(e) => { e.stopPropagation(); onFaceClick('distal'); }} 
            onMouseEnter={() => setHoveredFace('distal')} onMouseLeave={() => setHoveredFace(null)} 
            style={{ transition: 'fill 0.2s, opacity 0.2s', opacity: hoveredFace === 'distal' ? 0.8 : 1 }} />
          
          <path d={paths.lingual} fill={getFaceColor('lingual', faces.lingual)} 
            onClick={(e) => { e.stopPropagation(); onFaceClick('lingual'); }} 
            onMouseEnter={() => setHoveredFace('lingual')} onMouseLeave={() => setHoveredFace(null)} 
            style={{ transition: 'fill 0.2s, opacity 0.2s', opacity: hoveredFace === 'lingual' ? 0.8 : 1 }} />
          
          <path d={paths.oclusal} fill={getFaceColor('oclusal', faces.oclusal)} 
            onClick={(e) => { e.stopPropagation(); onFaceClick('oclusal'); }} 
            onMouseEnter={() => setHoveredFace('oclusal')} onMouseLeave={() => setHoveredFace(null)} 
            style={{ transition: 'fill 0.2s, opacity 0.2s', opacity: hoveredFace === 'oclusal' ? 0.8 : 1 }} />
        </g>

        {ausente && (
          <g transform="translate(50, 50)">
            <line x1="-30" y1="-30" x2="30" y2="30" stroke={COLORS.error} strokeWidth="6" strokeLinecap="round" />
            <line x1="30" y1="-30" x2="-30" y2="30" stroke={COLORS.error} strokeWidth="6" strokeLinecap="round" />
          </g>
        )}

        <text x="50" y="115" textAnchor="middle" fontSize="18" fontWeight="800" fill={isSelected ? COLORS.primary : COLORS.textLight}>
          {number}
        </text>

        {hasMark && !ausente && (
          <circle cx="50" cy="15" r="4" fill={COLORS.primary} filter="url(#glow)">
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {showTooltip && !ausente && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: `1px solid ${COLORS.border}`,
          whiteSpace: 'nowrap',
          zIndex: 100,
          marginBottom: '5px'
        }}>
          Diente {number}
        </div>
      )}
    </div>
  );
});

// ============================================
// 5. COMPONENTE PRINCIPAL CON CONEXIÓN AL PADRE
// ============================================

// CAMBIO 1: AHORA RECIBE PROPS PARA AVISARLE AL PADRE
export const GeneralOdontogram = ({ onHistoryChange, onChange, onUpdate, value }: any) => {
  const [activeState, setActiveState] = useState(STATES[0].id);
  const [activeTool, setActiveTool] = useState(CLINICAL_TOOLS[0].id);
  const [teethData, setTeethData] = useState<Record<string, ToothData>>({});
  
  // HISTORIAL DE ACCIONES INDIVIDUALES
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false); // Guardia para evitar bucles

  // REHIDRATACIÓN: Cargar datos desde Supabase al estado local
  useEffect(() => {
    // Si ya cargamos una vez, o no hay datos, no hacemos nada
    if (isLoaded || !value || !Array.isArray(value) || value.length === 0) return;

    const restoredData: Record<string, ToothData> = {};
    
    value.forEach((hallazgo: any) => {
      const num = hallazgo.diente;
      if (!restoredData[num]) {
        restoredData[num] = { 
          number: num, ausente: false, 
          faces: { oclusal: COLORS.healthy, vestibular: COLORS.healthy, lingual: COLORS.healthy, mesial: COLORS.healthy, distal: COLORS.healthy },
          marks: []
        };
      }

      if (hallazgo.tipo === 'ausente') {
        restoredData[num].ausente = true;
      } else {
        const tool = CLINICAL_TOOLS.find(t => t.id === hallazgo.tipo);
        if (tool && hallazgo.superficie) {
          restoredData[num].faces[hallazgo.superficie as keyof FaceData] = tool.color;
          restoredData[num].marks.push({
            face: hallazgo.superficie, tool: hallazgo.tipo,
            state: hallazgo.severidad, timestamp: Date.now()
          });
        }
      }
    });

    setTeethData(restoredData);
    setIsLoaded(true); // Bloqueamos futuras recargas para que no haya bucle
  }, [value, isLoaded]);
  
  const upperTeeth = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  const lowerTeeth = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];

  const currentToolObj = CLINICAL_TOOLS.find(t => t.id === activeTool) || CLINICAL_TOOLS[0];

  // Filtrar herramientas por categoría y búsqueda
  const filteredTools = CLINICAL_TOOLS.filter(t => {
    const matchesCategory = selectedCategory === 'todos' || t.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Estadísticas
  const stats = {
    totalMarcas: Object.values(teethData).reduce((acc, tooth) => acc + (tooth.marks?.length || 0), 0),
    dientesConMarcas: Object.values(teethData).filter(t => t.marks?.length > 0).length,
    ausentes: Object.values(teethData).filter(t => t.ausente).length,
    sanos: 32 - Object.values(teethData).filter(t => t.ausente || t.marks?.length > 0).length,
    porEstado: STATES.map(state => ({
      ...state,
      count: Object.values(teethData).filter(t => t.marks?.some(m => m.state === state.id)).length
    }))
  };

  const getToothData = (num: string): ToothData => {
    return teethData[num] || { 
      number: num,
      ausente: false, 
      faces: { oclusal: COLORS.healthy, vestibular: COLORS.healthy, lingual: COLORS.healthy, mesial: COLORS.healthy, distal: COLORS.healthy },
      marks: []
    };
  };

  // Manejar click en cara del diente 
  const handleFaceClick = (num: string, face: string) => {
    
    // CASO 1: HERRAMIENTA "AUSENTE"
    if (activeTool === 'ausente') {
      const newAction = { type: 'toggle-ausente', tooth: num, timestamp: Date.now() };
      setActionHistory(prev => [newAction, ...prev].slice(0, 20));
      
      setTeethData(prev => {
        const current = prev[num] || getToothData(num);
        return { ...prev, [num]: { ...current, ausente: !current.ausente } };
      });
      return;
    }

    // CASO 2: HERRAMIENTAS CLÍNICAS (Resina, caries, etc)
    const paintColor = currentToolObj.color;
    const currentTooth = getToothData(num);
    
    const existingMark = currentTooth.marks?.find(m => m.face === face && m.tool === activeTool);
    
    if (!existingMark) {
      const newAction = { 
        type: 'mark', 
        tooth: num, 
        face, 
        tool: activeTool, 
        state: activeState, 
        timestamp: Date.now() 
      };
      setActionHistory(prev => [newAction, ...prev].slice(0, 20));
    }
    
    setTeethData(prev => {
      const current = prev[num] || getToothData(num);
      const checkMark = current.marks?.find(m => m.face === face && m.tool === activeTool);
      
      return {
        ...prev,
        [num]: {
          ...current,
          faces: { ...current.faces, [face]: paintColor },
          marks: checkMark 
            ? current.marks
            : [...(current.marks || []), { 
                face, 
                tool: activeTool, 
                state: activeState, 
                timestamp: Date.now()
              }]
        }
      };
    });
  };

  const clearAll = () => {
    if (window.confirm('¿Está seguro de limpiar todo el odontograma?')) {
      setTeethData({});
      setActionHistory([]);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ teethData, actionHistory }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `odontograma_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setTeethData(data.teethData || {});
          setActionHistory(data.actionHistory || []);
        } catch (error) {
          alert('Error al importar el archivo');
        }
      };
      reader.readAsText(file);
    }
  };

  // Atajos de teclado para estados
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') setActiveState('pendiente');
      if (e.ctrlKey && e.key === '2') setActiveState('realizado');
      if (e.ctrlKey && e.key === '3') setActiveState('externo');
      if (e.ctrlKey && e.key === '4') setActiveState('presupuesto');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 🚀 SINCRONIZACIÓN: Avisar al padre para guardar en Supabase
  // Usamos un Ref para comparar y evitar que el Padre se vuelva loco
  const lastUpdateRef = React.useRef("");

  useEffect(() => {
    const hallazgosExportar: any[] = [];

    Object.values(teethData).forEach(diente => {
      if (diente.ausente) {
        hallazgosExportar.push({
          id: `aus-${diente.number}`,
          diente: diente.number, tipo: 'ausente',
          descripcion: 'Diente ausente', fechaRegistro: new Date().toISOString()
        });
      }
      
      if (diente.marks && diente.marks.length > 0) {
        diente.marks.forEach(marca => {
          hallazgosExportar.push({
            id: `m-${diente.number}-${marca.tool}-${marca.face}`,
            diente: diente.number, tipo: marca.tool,
            superficie: marca.face, severidad: marca.state,
            descripcion: `Cara ${marca.face}`, fechaRegistro: new Date(marca.timestamp).toISOString()
          });
        });
      }
    });

    // VÁLVULA DE SEGURIDAD: Solo avisamos al padre si los datos CAMBIARON de verdad
    // Excluimos campo `fechaRegistro` (puede cambiar cada render) para comparación estable
    const currentDataStr = JSON.stringify(hallazgosExportar.map(({ fechaRegistro, ...rest }) => rest));
    if (lastUpdateRef.current === currentDataStr) return;

    lastUpdateRef.current = currentDataStr;

    // Avisamos al padre
    if (onChange) onChange(hallazgosExportar);
    if (onUpdate) onUpdate(hallazgosExportar);
    if (onHistoryChange) onHistoryChange(hallazgosExportar);

  }, [teethData]); // Solo reacciona a cambios en los dientes, no a las funciones del padre

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      width: '100%',
      background: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      border: `1px solid ${COLORS.border}`,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      color: COLORS.text
    }}>
      <style>{`
        .tooth-container { 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          cursor: pointer;
        }
        .tooth-container:hover { 
          transform: scale(1.15) translateY(-2px); 
          z-index: 10; 
          filter: drop-shadow(0 8px 16px rgba(0, 113, 227, 0.2));
        }
        .tooth-container:active { 
          transform: scale(1.08) translateY(0px); 
          transition: all 0.1s ease;
        }
        .face-hover { 
          filter: brightness(1.1) saturate(1.2); 
          transition: filter 0.2s ease;
        }
        .tooth-selected {
          animation: toothPulse 1.5s ease-in-out infinite;
        }
        @keyframes toothPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(0, 113, 227, 0); }
        }
        .custom-select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1em;
          transition: all 0.2s ease;
        }
        .custom-select:focus {
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
          border-color: ${COLORS.primary};
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        .tool-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .tool-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.5s;
        }
        .tool-button:hover::before {
          left: 100%;
        }
        .tool-button:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }
        .tool-button:active {
          transform: translateY(-1px) scale(0.98);
          transition: all 0.1s ease;
        }
        .odontogram-grid {
          animation: fadeIn 0.6s ease-out;
        }
        .legend-item {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .legend-item:hover {
          transform: translateX(4px);
        }
      `}</style>

      {/* ===== BARRA DE HERRAMIENTAS SUPERIOR ===== */}
      <div style={{
        padding: '20px 30px',
        background: '#f8fafc',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        
        {/* Selector de Estado con botones visuales */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATES.map(state => (
            <button
              key={state.id}
              onClick={() => setActiveState(state.id)}
              title={state.longDescription}
              style={{
                padding: '8px 16px',
                background: activeState === state.id ? state.color : 'white',
                color: activeState === state.id ? 'white' : state.color,
                border: `2px solid ${state.color}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: activeState === state.id ? `0 2px 8px ${state.color}80` : 'none'
              }}
            >
              <state.icon size={14} />
              {state.name}
            </button>
          ))}
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={clearAll} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', 
              padding: '8px 12px', background: '#fee2e2', border: `1px solid ${COLORS.error}40`, 
              color: COLORS.error, borderRadius: '6px', cursor: 'pointer',
            }}
          >
            <Trash size={14} /> Limpiar todo
          </button>
          <button 
            onClick={() => setShowHelp(!showHelp)}
            style={{ padding: '8px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '6px', cursor: 'pointer' }}
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* ===== PANEL DE AYUDA ===== */}
      {showHelp && (
        <div className="animate-fadeIn glass-panel" style={{
          margin: '20px',
          padding: '20px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.95)'
        }}>
          <h4 style={{ marginBottom: '10px' }}>Atajos de teclado:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
            <div>• <strong>Ctrl+1:</strong> Pendiente</div>
            <div>• <strong>Ctrl+2:</strong> Realizado</div>
            <div>• <strong>Ctrl+3:</strong> Externo</div>
            <div>• <strong>Ctrl+4:</strong> Presupuesto</div>
            <div>• Click en cara: Aplicar herramienta</div>
            <div>• Click en diente: Seleccionar</div>
          </div>
          
          <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>Estados clínicos:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
            {STATES.map(state => (
              <div key={state.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: state.color }} />
                <div>
                  <strong>{state.name}:</strong> {state.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CONTENIDO PRINCIPAL (2 COLUMNAS) ===== */}
      <div style={{ display: 'flex', gap: '24px', padding: '24px' }}>
        
        {/* ===== COLUMNA IZQUIERDA: HERRAMIENTAS ===== */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Buscador de herramientas */}
          <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, padding: '16px' }}>
            <input
              type="text"
              placeholder="Buscar herramienta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                fontSize: '13px',
                background: 'white',
                color: COLORS.text
              }}
            />
          </div>

          {/* Filtro por categorías */}
          <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, padding: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textLight, display: 'block', marginBottom: '8px' }}>
              FILTRAR POR CATEGORÍA
            </label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${COLORS.border}`,
                fontSize: '13px',
                background: 'white',
                color: COLORS.text
              }}
            >
              <option value="todos">Todas las categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Herramienta Activa (PREVIEW) */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            border: `2px solid ${currentToolObj.color}`,
            padding: '20px',
            boxShadow: `0 4px 12px ${currentToolObj.color}40`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: currentToolObj.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <currentToolObj.icon size={24} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: currentToolObj.color }}>{currentToolObj.name}</div>
                <div style={{ fontSize: '11px', color: COLORS.textLight }}>Herramienta activa</div>
                <div style={{ fontSize: '10px', color: COLORS.textLight, marginTop: '2px' }}>
                  Estado: {STATES.find(s => s.id === activeState)?.name}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: COLORS.text }}>{currentToolObj.description}</div>
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              background: `${currentToolObj.color}20`, 
              borderRadius: '8px',
              fontSize: '12px',
              color: currentToolObj.color,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Brush size={14} />
              <span>Click en cualquier cara para aplicar</span>
            </div>
          </div>

          {/* Lista de herramientas filtradas */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            border: `1px solid ${COLORS.border}`,
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 800, color: COLORS.textLight, margin: 0 }}>
                HERRAMIENTAS ({filteredTools.length})
              </h3>
            </div>
            <div style={{ padding: '10px' }}>
              {filteredTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: activeTool === tool.id ? `${tool.color}20` : 'transparent',
                    border: activeTool === tool.id ? `2px solid ${tool.color}` : `1px solid transparent`,
                    borderRadius: '8px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                    color: COLORS.text
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => {
                    if (activeTool !== tool.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    background: tool.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <tool.icon size={16} color="white" />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{tool.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textLight }}>{tool.category}</div>
                  </div>
                  {activeTool === tool.id && (
                    <CheckCircle size={16} color={tool.color} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== COLUMNA DERECHA: ODONTOGRAMA Y DASHBOARD ===== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* LIENZO DEL ODONTOGRAMA (SIN ZOOM) */}
          <div style={{ 
            background: 'white',
            borderRadius: '16px',
            border: `1px solid ${COLORS.border}`,
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '50px',
            alignItems: 'center'
          }}>
            {/* Arcada Superior */}
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '10px' }}>
                {upperTeeth.map((num, index) => {
                  const data = getToothData(num);
                  return (
                    <React.Fragment key={num}>
                      {index === 8 && <div style={{ width: '2px', background: '#e2e8f0', margin: '0 10px', borderRadius: '2px' }} />}
                      <ToothGraphic 
                        number={num} faces={data.faces} ausente={data.ausente}
                        onFaceClick={(face) => handleFaceClick(num, face)}
                        hasMark={data.marks?.length > 0}
                        isSelected={selectedTooth === num}
                        onSelect={() => setSelectedTooth(prev => prev === num ? null : num)}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Línea Divisoria */}
            <div style={{ width: '70%', height: '1px', margin: '0 auto', background: `linear-gradient(90deg, transparent, #e2e8f0, transparent)` }} />

            {/* Arcada Inferior */}
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '10px' }}>
                {lowerTeeth.map((num, index) => {
                  const data = getToothData(num);
                  return (
                    <React.Fragment key={num}>
                      {index === 8 && <div style={{ width: '2px', background: '#e2e8f0', margin: '0 10px', borderRadius: '2px' }} />}
                      <ToothGraphic 
                        number={num} faces={data.faces} ausente={data.ausente}
                        onFaceClick={(face) => handleFaceClick(num, face)}
                        hasMark={data.marks?.length > 0}
                        isSelected={selectedTooth === num}
                        onSelect={() => setSelectedTooth(prev => prev === num ? null : num)}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DASHBOARD CLÍNICO */}
          <div style={{ 
            background: 'white',
            borderRadius: '16px',
            border: `1px solid ${COLORS.border}`,
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <PieChart size={20} color={COLORS.primary} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Dashboard Clínico</h3>
              <button 
                onClick={() => setShowStats(!showStats)}
                style={{ marginLeft: 'auto', padding: '6px 12px', background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                {showStats ? 'Ocultar detalles' : 'Ver detalles'}
              </button>
            </div>

            {/* Estadísticas principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '12px', color: COLORS.textLight, fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>32</div>
              </div>
              
              <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Sanos</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#15803d' }}>{stats.sanos}</div>
              </div>

              <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Con Marcas</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#b91c1c' }}>{stats.dientesConMarcas}</div>
              </div>

              <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Ausentes</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#334155' }}>{stats.ausentes}</div>
              </div>
            </div>
  
            {/* Detalles por estado (condicional) */}
            {showStats && (
              <div className="animate-fadeIn" style={{ 
                padding: '16px', 
                background: '#f8fafc', 
                borderRadius: '12px',
                border: `1px solid ${COLORS.border}`
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Distribución por Estado</h4>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {stats.porEstado.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: s.color }} />
                      <span style={{ fontSize: '13px' }}>{s.name}: <strong>{s.count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* NOVEDADES RECIENTES - AHORA SIN DUPLICADOS */}
            {actionHistory.length > 0 && (
              <div className="animate-fadeIn" style={{ 
                marginTop: '20px',
                padding: '16px', 
                background: '#f8fafc', 
                borderRadius: '12px',
                border: `1px solid ${COLORS.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <RefreshCw size={14} color={COLORS.primary} />
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Novedades recientes</h4>
                </div>
                
                {/* Últimas 10 acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {actionHistory.slice(0, 10).map((accion, index) => {
                    
                    if (accion.type === 'mark') {
                      const tool = CLINICAL_TOOLS.find(t => t.id === accion.tool);
                      if (!tool) return null;
                      
                      const estado = STATES.find(s => s.id === accion.state);
                      
                      return (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '8px',
                          border: `1px solid ${tool.color}40`,
                          boxShadow: `0 2px 4px ${tool.color}20`
                        }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '8px', 
                            background: tool.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <tool.icon size={16} color="white" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: tool.color }}>{tool.name}</div>
                            <div style={{ fontSize: '11px', color: COLORS.textLight }}>
                              Diente {accion.tooth} - Cara {accion.face} • {estado?.name || ''}
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: COLORS.textLight }}>
                            {new Date(accion.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    } 
                    
                    else if (accion.type === 'toggle-ausente') {
                      return (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '8px',
                          border: `1px solid ${COLORS.error}40`,
                          boxShadow: `0 2px 4px ${COLORS.error}20`
                        }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '8px', 
                            background: COLORS.error,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <X size={16} color="white" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.error }}>Diente ausente</div>
                            <div style={{ fontSize: '11px', color: COLORS.textLight }}>
                              Diente {accion.tooth}
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: COLORS.textLight }}>
                            {new Date(accion.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
            
            {/* Leyenda de colores */}
            <div style={{ 
              marginTop: '20px', 
              padding: '16px', 
              background: '#f8fafc', 
              borderRadius: '12px',
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              gap: '30px',
              flexWrap: 'wrap'
            }}>
              {STATES.map(state => (
                <div key={state.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: state.color }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{state.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== BARRA INFERIOR ===== */}
      <div style={{ 
        padding: '15px 30px', 
        background: '#f8fafc', 
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ fontSize: '12px', color: COLORS.textLight }}>
          {actionHistory.length} acciones recientes
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={exportData}
            style={{ padding: '8px 16px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <Download size={14} /> Exportar
          </button>
          <label style={{ padding: '8px 16px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Upload size={14} /> Importar
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </div>
  );
};