import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ConfirmDialog } from '../../../shared/components/Toast';
import {
  Activity, X, Circle, Square, Triangle, Zap, Bone, CheckCircle, AlertCircle, FileText, Trash, RefreshCw,
  Info, Brush, LayoutGrid, Undo, Redo, PieChart, Layers, ClipboardList, TrendingUp, Target, Sparkles,
  Shield, Heart, Award, Scissors, Star, Sun, Eye, Pen, Droplet, Clock, Download, Upload
} from 'lucide-react';

// ============================================
// 1. CONFIGURACIÓN VISUAL PREMIUM (OrthoOdontogram)
// ============================================

const COLORS = {
  pendiente: '#6B7280',
  realizado: '#9CA3AF',
  proceso: '#475569',
  externo: '#4B5563',
  presupuesto: '#D1D5DB',
  healthy: '#FAFAFA',
  caries: '#1E3A5F',
  resina: '#2D3748',
  endodoncia: '#1A365D',
  implante: '#2B6CB0',
  corona: '#9C4221',
  extraccion: '#744210',
  sellante: '#718096',
  bracketMetal: '#1E3A5F',
  bracketZafiro: '#2D3748',
  bracketAutoligable: '#1A365D',
  tubo: '#9C4221',
  banda: '#744210',
  modulo: '#97266D',
  ligadura: '#4A5568',
  boton: '#276749',
  biteTurbo: '#C05621',
  arco: '#2B6CB0',
  cadeneta: '#6B46C1',
  resorte: '#718096',
  instalado: '#6B7280',
  despegado: '#9CA3AF',
  fracturado: '#D1D5DB',
  planificado: '#9CA3AF',
  retirado: '#E5E7EB',
  ausente: '#F3F4F6',
  primary: '#4B5563',
  primaryLight: '#F9FAFB',
  primaryDark: '#374151',
  secondary: '#6B7280',
  secondaryLight: '#F3F4F6',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  text: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderDark: '#D1D5DB',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  hoverBg: '#F3F4F6',
  shadowSm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  shadowXl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  shadowInner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

const STATES = [
  { 
    id: 'realizado', 
    name: 'Revision Actual', 
    color: COLORS.realizado, 
    description: 'Hallazgo presente en la revisión actual',
    longDescription: 'Hallazgo revisado en la sesión actual. Queda registrado en la bitácora clínica del paciente.',
    icon: CheckCircle,
    shortcut: 'Ctrl+1',
    clinicalMeaning: 'Revision clínica actual'
  },
  { 
    id: 'pendiente', 
    name: 'Pendiente', 
    color: COLORS.pendiente, 
    description: 'Patología / Requiere atención inmediata',
    longDescription: 'Caries activas, fracturas, lesiones que necesitan tratamiento urgente. El paciente presenta dolor o riesgo de complicaciones.',
    icon: AlertCircle,
    shortcut: 'Ctrl+2',
    clinicalMeaning: 'Diagnóstico pendiente de tratamiento'
  }
];

// ============================================
// 2. HERRAMIENTAS CLÍNICAS AMPLIADAS (40+)
// ============================================

const CLINICAL_TOOLS = [
  // Diagnóstico
  { id: 'caries', name: 'Caries', icon: Circle, type: 'hallazgo', color: COLORS.caries, description: 'Lesión cariosa activa', category: 'Diagnóstico', detailed: 'Caries superficial, media o profunda', cie10: 'K02.1', cdt: 'D0145' },
  { id: 'caries_profunda', name: 'Caries Profunda', icon: Circle, type: 'hallazgo', color: '#b91c1c', description: 'Caries que afecta dentina profunda', category: 'Diagnóstico', cie10: 'K02.9', cdt: 'D0220' },
  { id: 'fractura', name: 'Fractura', icon: AlertCircle, type: 'hallazgo', color: '#f97316', description: 'Fractura dental', category: 'Diagnóstico', cie10: 'S02.5', cdt: 'D9930' },
  { id: 'fracturado', name: 'Fracturado', icon: AlertCircle, type: 'hallazgo', color: '#ea580c', description: 'Diente fracturado', category: 'Diagnóstico', cie10: 'S02.5', cdt: 'D9930' },
  { id: 'abrasion', name: 'Abrasión', icon: AlertCircle, type: 'hallazgo', color: '#f9a8d4', description: 'Desgaste dental por cepillado', category: 'Diagnóstico', cie10: 'K03.1', cdt: 'D9310' },
  { id: 'atricion', name: 'Atrición', icon: AlertCircle, type: 'hallazgo', color: '#fdba74', description: 'Desgaste por bruxismo', category: 'Diagnóstico', cie10: 'K03.0', cdt: 'D9310' },
  { id: 'erosion', name: 'Erosión', icon: AlertCircle, type: 'hallazgo', color: '#67e8f9', description: 'Pérdida de esmalte por ácidos', category: 'Diagnóstico', cie10: 'K03.2', cdt: 'D9310' },

  // Tratamientos Básicos
  { id: 'resina', name: 'Resina', icon: Square, type: 'tratamiento', color: COLORS.resina, description: 'Restauración con resina compuesta', category: 'Tratamiento', cie10: 'K08.89', cdt: 'D2391' },
  { id: 'amalgama', name: 'Amalgama', icon: Square, type: 'tratamiento', color: '#a78bfa', description: 'Restauración con amalgama de plata', category: 'Tratamiento', cie10: 'K08.89', cdt: 'D2140' },
  { id: 'ionomero', name: 'Ionómero', icon: Square, type: 'tratamiento', color: '#7dd3fc', description: 'Restauración con ionómero de vidrio', category: 'Tratamiento', cie10: 'K08.89', cdt: 'D2330' },
  { id: 'incrustacion', name: 'Incrustación', icon: Square, type: 'tratamiento', color: '#f59e0b', description: 'Incrustación dental', category: 'Tratamiento', cie10: 'K08.89', cdt: 'D2510' },

  // Endodoncia
  { id: 'endodoncia', name: 'Endodoncia', icon: Zap, type: 'tratamiento', color: COLORS.endodoncia, description: 'Tratamiento de conducto', category: 'Endodoncia', cie10: 'K04.0', cdt: 'D3310' },
  { id: 'retratamiento', name: 'Retratamiento', icon: Zap, type: 'tratamiento', color: '#7c3aed', description: 'Retratamiento de conducto', category: 'Endodoncia', cie10: 'K04.0', cdt: 'D3330' },
  { id: 'apicectomia', name: 'Apicectomía', icon: Zap, type: 'quirurgico', color: '#7c3aed', description: 'Cirugía apical', category: 'Quirúrgico', cie10: 'K04.5', cdt: 'D3410' },

  // Implantes
  { id: 'implante', name: 'Implante', icon: Bone, type: 'tratamiento', color: COLORS.implante, description: 'Colocación de implante dental', category: 'Implantología', cie10: 'K08.1', cdt: 'D6010' },
  { id: 'pilastra', name: 'Pilastra', icon: Bone, type: 'tratamiento', color: '#818cf8', description: 'Colocación de pilastra', category: 'Implantología', cie10: 'K08.1', cdt: 'D6057' },
  { id: 'corona_implante', name: 'Corona/Implante', icon: Triangle, type: 'protesis', color: COLORS.corona, description: 'Corona sobre implante', category: 'Prostodoncia', cie10: 'K08.1', cdt: 'D6065' },

  // Prótesis
  { id: 'corona', name: 'Corona', icon: Triangle, type: 'tratamiento', color: COLORS.corona, description: 'Corona dental / Funda', category: 'Prostodoncia', cie10: 'K08.89', cdt: 'D2740' },
  { id: 'puente', name: 'Puente', icon: Heart, type: 'prostodoncia', color: '#84cc16', description: 'Puente dental fijo', category: 'Prostodoncia', cie10: 'K08.3', cdt: 'D6240' },
  { id: 'protesis', name: 'Prótesis', icon: Award, type: 'prostodoncia', color: '#a855f7', description: 'Prótesis removible', category: 'Prostodoncia', cie10: 'K08.1', cdt: 'D5110' },
  { id: 'protesis_total', name: 'Prótesis Total', icon: Award, type: 'prostodoncia', color: '#a855f7', description: 'Prótesis completa', category: 'Prostodoncia', cie10: 'K08.1', cdt: 'D5130' },

  // Cirugía
  { id: 'extraccion', name: 'Extracción', icon: Scissors, type: 'tratamiento', color: COLORS.extraccion, description: 'Extracción dental simple', category: 'Quirúrgico', cie10: 'K08.1', cdt: 'D7140' },
  { id: 'extraccion_compleja', name: 'Extracción Compleja', icon: Scissors, type: 'tratamiento', color: '#fb7185', description: 'Extracción quirúrgica', category: 'Quirúrgico', cie10: 'K08.1', cdt: 'D7210' },
  { id: 'cordal', name: 'Cordal', icon: Scissors, type: 'tratamiento', color: '#fda4af', description: 'Extracción de muela del juicio', category: 'Quirúrgico', cie10: 'K01.0', cdt: 'D7240' },
  { id: 'quiste', name: 'Quiste', icon: AlertCircle, type: 'quirurgico', color: '#fca5a5', description: 'Eliminación de quiste', category: 'Quirúrgico', cie10: 'K09.2', cdt: 'D7450' },

  // Ortodoncia
  { id: 'ortodoncia', name: 'Brackets', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Tratamiento de ortodoncia', category: 'Ortodoncia', cie10: 'K07.2', cdt: 'D8080' },
  { id: 'brackets_metalicos', name: 'Brackets Metálicos', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Brackets metálicos convencionales', category: 'Ortodoncia', cie10: 'K07.2', cdt: 'D8080' },
  { id: 'brackets_esteticos', name: 'Brackets Estéticos', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Brackets de zafiro/cerámica', category: 'Ortodoncia', cie10: 'K07.2', cdt: 'D8090' },
  { id: 'brackets_autoligables', name: 'Brackets Autoligables', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Brackets autoligables', category: 'Ortodoncia', cie10: 'K07.2', cdt: 'D8090' },
  { id: 'arco', name: 'Arco', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Cambio de arco', category: 'Ortodoncia', cie10: 'K07.2', cdt: 'D8670' },
  { id: 'elasticos', name: 'Elásticos', icon: Star, type: 'tratamiento', color: '#ec4899', description: 'Elásticos intermaxilares', category: 'Ortodoncia', cie10: 'K07.2', cdt: 'D8660' },

  // Estética
  { id: 'blanqueamiento', name: 'Blanqueamiento', icon: Sun, type: 'estético', color: '#f97316', description: 'Blanqueamiento dental', category: 'Estética', cie10: 'K03.7', cdt: 'D9972' },
  { id: 'carillas', name: 'Carillas', icon: Eye, type: 'estético', color: '#f97316', description: 'Carillas de porcelana', category: 'Estética', cie10: 'K03.7', cdt: 'D2960' },
  { id: 'contorno', name: 'Contorno Gingival', icon: Pen, type: 'estético', color: '#f97316', description: 'Recontorneo de encía', category: 'Estética', cie10: 'K08.89', cdt: 'D4249' },

  // Preventivo
  { id: 'sellante', name: 'Sellante', icon: Droplet, type: 'preventivo', color: COLORS.sellante, description: 'Sellante de fosas y fisuras', category: 'Preventivo', cie10: 'Z29.3', cdt: 'D1351', onlyPosterior: true },
  { id: 'fluor', name: 'Aplicación Flúor', icon: Droplet, type: 'preventivo', color: COLORS.sellante, description: 'Aplicación tópica de flúor', category: 'Preventivo', cie10: 'Z29.3', cdt: 'D1208' },
  { id: 'profilaxis', name: 'Profilaxis', icon: Brush, type: 'preventivo', color: COLORS.sellante, description: 'Limpieza dental', category: 'Preventivo', cie10: 'Z29.3', cdt: 'D1110' },
  { id: 'limpieza_general', name: 'Limpieza General', icon: Sparkles, type: 'preventivo', color: '#64748b', description: 'Automatización de limpieza general', category: 'Preventivo', cie10: 'Z29.3', cdt: 'D1110' },

  // Estados
  { id: 'ausente', name: 'Ausente', icon: X, type: 'estado', color: COLORS.ausente, description: 'Diente ausente / Perdido', category: 'Estado', cie10: 'K08.1', cdt: '—' },
  { id: 'extraido', name: 'Extraído', icon: Scissors, type: 'estado', color: '#e5e7eb', description: 'Diente extraído', category: 'Estado', cie10: 'K08.1', cdt: 'D7140' },
  { id: 'no_erupcionado', name: 'No Erupcionado', icon: X, type: 'estado', color: COLORS.ausente, description: 'Diente no erupcionado', category: 'Estado', cie10: 'K01.1', cdt: '—' },
  { id: 'retenido', name: 'Retenido', icon: X, type: 'estado', color: COLORS.ausente, description: 'Diente retenido', category: 'Estado', cie10: 'K01.0', cdt: '—' },
  { id: 'supernumerario', name: 'Supernumerario', icon: Star, type: 'estado', color: '#a855f7', description: 'Diente extra', category: 'Estado', cie10: 'K00.1', cdt: '—' },
];

const CATEGORIES = Array.from(new Set(CLINICAL_TOOLS.map(t => t.category)));

// ============================================
// 3. ANATOMÍA Y DENTICIÓN
// ============================================

/** Dientes anteriores adultos: 11-13, 21-23, 31-33, 41-43 */
const ANTERIOR_ADULT = new Set(['11','12','13','21','22','23','31','32','33','41','42','43']);
/** Dientes anteriores temporales: 51-53, 61-63, 71-73, 81-83 */
const ANTERIOR_PRIMARY = new Set(['51','52','53','61','62','63','71','72','73','81','82','83']);

const isAnteriorTooth = (num: string) => ANTERIOR_ADULT.has(num) || ANTERIOR_PRIMARY.has(num);
const isPosteriorTooth = (num: string) => !isAnteriorTooth(num);

/** Dientes de cordal (terceros molares) */
const WISDOM_TEETH = new Set(['18','28','38','48']);

/** Nombre de cara según tipo de diente */
const getFaceName = (face: string, toothNum: string): string => {
  if (face === 'oclusal' && isAnteriorTooth(toothNum)) return 'Incisal';
  const map: Record<string, string> = {
    oclusal: 'Oclusal', vestibular: 'Vestibular', lingual: 'Lingual/Palatino',
    mesial: 'Mesial', distal: 'Distal'
  };
  return map[face] ?? face;
};

/** Calcula edad en años a partir de fecha ISO */
const calcAge = (birthDate?: string | null): number | null => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age < 0 ? 0 : age;
};

type DentitionMode = 'adult' | 'mixed' | 'primary';

const getDentitionMode = (age: number | null): DentitionMode => {
  if (age === null) return 'adult';
  if (age <= 5) return 'primary';
  if (age <= 12) return 'mixed';
  return 'adult';
};

interface DentitionSet {
  upper: string[]; lower: string[];
  upperPrimary?: string[]; lowerPrimary?: string[];
  midline: number; midlinePrimary?: number;
  label: string; color: string; description: string;
}

const DENTITION_SETS: Record<DentitionMode, DentitionSet> = {
  adult: {
    upper: ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'],
    lower: ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'],
    midline: 8,
    label: 'Permanente', color: COLORS.primary, description: 'Adulto / Joven (FDI 11-48)'
  },
  primary: {
    upper: ['55','54','53','52','51','61','62','63','64','65'],
    lower: ['85','84','83','82','81','71','72','73','74','75'],
    midline: 5,
    label: 'Temporal', color: '#f59e0b', description: 'Niño ≤ 5 años (FDI 51-85)'
  },
  mixed: {
    // Arcadas permanentes (en erupción)
    upper: ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'],
    lower: ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'],
    midline: 8,
    // Arcadas temporales (pueden coexistir)
    upperPrimary: ['55','54','53','52','51','61','62','63','64','65'],
    lowerPrimary: ['85','84','83','82','81','71','72','73','74','75'],
    midlinePrimary: 5,
    label: 'Mixta', color: '#10b981', description: 'Niño 6-12 años - dentición permanente + temporal'
  },
};

/** Reglas de validación anatómica */
interface ValidationResult { blocked: boolean; message: string }

const validateMark = (toothNum: string, face: string, toolId: string, isAusente: boolean): ValidationResult => {
  // Regla 1: No marcar dientes ausentes (excepto cambiar estado ausente)
  if (isAusente && toolId !== 'ausente') {
    return { blocked: true, message: `Diente ${toothNum} está marcado como ausente. Desmárcalo primero para agregar tratamientos.` };
  }
  // Regla 2: Sellante solo en posteriores (fosas y fisuras)
  if (toolId === 'sellante' && isAnteriorTooth(toothNum)) {
    return { blocked: true, message: `Diente ${toothNum}: el sellante se aplica solo en posteriores (fosas y fisuras). Los anteriores no tienen superficie oclusal.` };
  }
  // Regla 3: Cara oclusal en anteriores → superficie no existe clínicamente
  if (face === 'oclusal' && isAnteriorTooth(toothNum) && !['ausente','no_erupcionado','retenido','supernumerario','fluor','profilaxis','blanqueamiento','ortodoncia','brackets_metalicos','brackets_esteticos','brackets_autoligables','arco','elasticos'].includes(toolId)) {
    return { blocked: true, message: `Diente ${toothNum}: la cara incisal (centro) no es oclusal en dientes anteriores. Usa vestibular, mesial o distal.` };
  }
  // Regla 4: Cordales no aceptan ortodoncia convencional
  if (WISDOM_TEETH.has(toothNum) && ['ortodoncia','brackets_metalicos','brackets_esteticos','brackets_autoligables'].includes(toolId)) {
    return { blocked: false, message: `Diente ${toothNum} es un tercer molar (cordal). Los brackets en cordales son poco frecuentes.` };
  }
  return { blocked: false, message: '' };
};

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
  readonlyAusente?: boolean;
  marks: Array<{
    id: string;
    face: string;
    tool: string;
    state: string;
    timestamp: number;
    proceso?: boolean;
    readonly?: boolean;
    sourceSessionDate?: string;
  }>;
  notes?: string;
}

interface HistorySnapshot {
  teethData: Record<string, ToothData>;
  actionHistory: any[];
}

const cloneHistorySnapshot = (snapshot: HistorySnapshot): HistorySnapshot => {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot));
};

interface OdontogramSnapshot {
  teethData: Record<string, ToothData>;
  actionHistory: any[];
  hydratedFromPrevious?: boolean;
  sourceDate?: string | null;
}

interface ToothProps {
  number: string;
  faces: FaceData;
  ausente?: boolean;
  isReadonly?: boolean;
  onFaceClick: (face: string) => void;
  hasMark?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  isAnterior?: boolean; // affects face label: Oclusal → Incisal
  isPrimary?: boolean;  // smaller visual hint for deciduous teeth
  previousMarks?: Array<{ tool: string; face: string; toolLabel?: string; cie10?: string; sessionDate?: string }>; // ghost layer
}

// ============================================
// 4. COMPONENTE DIENTE VISUAL PREMIUM (OrthoOdontogram)
// ============================================

const ToothGraphic = React.memo(({ number, faces, ausente, isSelected, onFaceClick }: any) => {
  return (
    <div
      className={`ortho-tooth${isSelected ? ' ortho-tooth-selected' : ''}`}
      style={{
        width: '56px',
        height: '86px',
        margin: '3px',
        position: 'relative',
        opacity: ausente ? 0.35 : 1,
        userSelect: 'none',
        zIndex: isSelected ? 20 : 1,
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id={`shadow-${number}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.1" />
          </filter>
        </defs>
        <circle cx="50" cy="50" r="42" fill={isSelected ? COLORS.secondaryLight : '#FFFFFF'} stroke={isSelected ? COLORS.primary : COLORS.borderDark} strokeWidth={isSelected ? "2.5" : "1.5"} filter={`url(#shadow-${number})`} />
        <g stroke={COLORS.borderDark} strokeWidth="1" fill="none">
          <path d="M 15 15 Q 50 5 85 15 L 65 35 Q 50 30 35 35 Z" fill={faces?.vestibular || '#FAFAFA'} onClick={() => onFaceClick('vestibular')} />
          <path d="M 35 65 Q 50 70 65 65 L 85 85 Q 50 95 15 85 Z" fill={faces?.lingual || '#FAFAFA'} onClick={() => onFaceClick('lingual')} />
          <path d="M 15 15 L 35 35 Q 30 50 35 65 L 15 85 Q 5 50 15 15 Z" fill={faces?.mesial || '#FAFAFA'} onClick={() => onFaceClick('mesial')} />
          <path d="M 85 15 L 65 35 Q 70 50 65 65 L 85 85 Q 95 50 85 15 Z" fill={faces?.distal || '#FAFAFA'} onClick={() => onFaceClick('distal')} />
          <circle cx="50" cy="50" r="15" fill={faces?.oclusal || '#F3F4F6'} stroke={COLORS.borderDark} strokeWidth="0.8" onClick={() => onFaceClick('oclusal')} />
        </g>
        {ausente && (
          <g transform="translate(50, 50)">
            <line x1="-28" y1="-28" x2="28" y2="28" stroke={COLORS.error} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
            <line x1="28" y1="-28" x2="-28" y2="28" stroke={COLORS.error} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          </g>
        )}
        <g>
          <rect x="32" y="108" width="36" height="22" rx="6" fill={isSelected ? COLORS.primary : COLORS.secondaryLight} stroke={isSelected ? COLORS.primaryDark : COLORS.borderDark} strokeWidth="1.5" filter={`url(#shadow-${number})`} />
          <text x="50" y="123" textAnchor="middle" fontSize="14" fontWeight="800" fill={isSelected ? '#FFFFFF' : COLORS.textLight}>
            {number}
          </text>
        </g>
      </svg>
    </div>
  );
});

const createEmptyFaces = (): FaceData => ({
  oclusal: COLORS.healthy,
  vestibular: COLORS.healthy,
  lingual: COLORS.healthy,
  mesial: COLORS.healthy,
  distal: COLORS.healthy,
});

const createEmptyTooth = (number: string): ToothData => ({
  number,
  ausente: false,
  readonlyAusente: false,
  faces: createEmptyFaces(),
  marks: [],
});

const normalizeSnapshot = (snapshot: any, readonly = false): OdontogramSnapshot | null => {
  if (!snapshot || typeof snapshot !== 'object') return null;

  const teethEntries = Object.entries(snapshot.teethData || {});
  if (!teethEntries.length) return null;

  const teethData = teethEntries.reduce<Record<string, ToothData>>((acc, [number, tooth]) => {
    const safeTooth = tooth as ToothData;
    const faces = {
      ...createEmptyFaces(),
      ...(safeTooth?.faces || {}),
    };

    acc[number] = {
      number,
      faces,
      ausente: Boolean(safeTooth?.ausente),
      readonlyAusente: readonly ? Boolean(safeTooth?.ausente) : Boolean(safeTooth?.readonlyAusente),
      marks: Array.isArray(safeTooth?.marks)
        ? safeTooth.marks.map((mark) => ({
            ...mark,
            readonly: readonly ? true : Boolean(mark.readonly),
          }))
        : [],
      notes: safeTooth?.notes,
    };

    return acc;
  }, {});

  return {
    teethData,
    actionHistory: Array.isArray(snapshot.actionHistory)
      ? snapshot.actionHistory.map((action: any) => ({ ...action, readonly: readonly ? true : Boolean(action.readonly) }))
      : [],
    hydratedFromPrevious: readonly,
    sourceDate: snapshot.sourceDate || null,
  };
};

const buildSnapshotFromHallazgos = (hallazgos: any[], readonly = false): OdontogramSnapshot | null => {
  if (!Array.isArray(hallazgos) || hallazgos.length === 0) return null;

  const normalizeState = (state: string) => (String(state || '').toLowerCase() === 'realizado' ? 'realizado' : 'pendiente');

  const teethData: Record<string, ToothData> = {};
  const actionHistory: any[] = [];

  hallazgos.forEach((hallazgo: any) => {
    const num = String(hallazgo.diente || '').trim();
    if (!num) return;

    if (!teethData[num]) {
      teethData[num] = createEmptyTooth(num);
    }

    if (hallazgo.tipo === 'ausente' || hallazgo.tipo === 'extraido') {
      teethData[num].ausente = true;
      teethData[num].readonlyAusente = readonly;
      actionHistory.push({
        type: 'toggle-ausente',
        tooth: num,
        timestamp: new Date(hallazgo.fechaRegistro || Date.now()).getTime(),
        readonly,
      });
      return;
    }

    const tool = CLINICAL_TOOLS.find(t => t.id === hallazgo.tipo);
    if (tool && hallazgo.superficie) {
      const face = hallazgo.superficie as keyof FaceData;
      teethData[num].faces[face] = tool.color;
      teethData[num].marks.push({
        id: hallazgo.id || `hgo_${num}_${hallazgo.superficie}_${hallazgo.tipo}`.replace(/\s+/g, '_').toLowerCase(),
        face: hallazgo.superficie,
        tool: hallazgo.tipo,
        state: normalizeState(String(hallazgo.severidad || 'pendiente')),
        timestamp: new Date(hallazgo.fechaRegistro || Date.now()).getTime(),
        proceso: Boolean((hallazgo as any).proceso),
        readonly,
        sourceSessionDate: hallazgo.fechaRegistro || '',
      });
      actionHistory.push({
        type: 'mark',
        tooth: num,
        face: hallazgo.superficie,
        tool: hallazgo.tipo,
        state: normalizeState(String(hallazgo.severidad || 'pendiente')),
        timestamp: new Date(hallazgo.fechaRegistro || Date.now()).getTime(),
        readonly,
      });
    }
  });

  return { teethData, actionHistory, hydratedFromPrevious: readonly, sourceDate: null };
};

// ============================================
// 5. COMPONENTE PRINCIPAL CON CONEXIÓN AL PADRE
// ============================================

// CAMBIO 1: AHORA RECIBE PROPS PARA AVISARLE AL PADRE
export const GeneralOdontogram = ({ onHistoryChange, onChange, onUpdate, value, birthDate, previousHallazgos, initialState, previousEstado }: any) => {
  const [activeState, setActiveState] = useState('realizado');
  const [activeTool, setActiveTool] = useState(CLINICAL_TOOLS[0].id);
  const [processMode, setProcessMode] = useState(false);
  const [teethData, setTeethData] = useState<Record<string, ToothData>>({});
  
  // HISTORIAL DE ACCIONES INDIVIDUALES
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false); // Guardia para evitar bucles
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const localChangesRef = useRef(false);
  const hydrationSignatureRef = useRef('');

  const getCurrentSnapshot = useCallback((): HistorySnapshot => ({
    teethData,
    actionHistory,
  }), [teethData, actionHistory]);

  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((prev) => [cloneHistorySnapshot(getCurrentSnapshot()), ...prev].slice(0, 50));
    setRedoStack([]);
  }, [getCurrentSnapshot]);

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return;
    const [last, ...rest] = undoStack;
    const current = cloneHistorySnapshot(getCurrentSnapshot());
    localChangesRef.current = true;
    setUndoStack(rest);
    setRedoStack((prev) => [current, ...prev].slice(0, 50));
    setTeethData(cloneHistorySnapshot(last).teethData);
    setActionHistory(cloneHistorySnapshot(last).actionHistory);
  }, [undoStack, getCurrentSnapshot]);

  const handleRedo = useCallback(() => {
    if (!redoStack.length) return;
    const [next, ...rest] = redoStack;
    const current = cloneHistorySnapshot(getCurrentSnapshot());
    localChangesRef.current = true;
    setRedoStack(rest);
    setUndoStack((prev) => [current, ...prev].slice(0, 50));
    setTeethData(cloneHistorySnapshot(next).teethData);
    setActionHistory(cloneHistorySnapshot(next).actionHistory);
  }, [redoStack, getCurrentSnapshot]);

  // DENTICIÓN
  const patientAge = useMemo(() => calcAge(birthDate), [birthDate]);
  const autoDentitionMode = useMemo(() => getDentitionMode(patientAge), [patientAge]);
  const [dentitionOverride, setDentitionOverride] = useState<DentitionMode | null>(null);
  const dentitionMode: DentitionMode = dentitionOverride ?? autoDentitionMode;
  const dentitionInfo = DENTITION_SETS[dentitionMode];

  const showValidationWarning = (msg: string, durationMs = 5000) => {
    setValidationWarning(msg);
    setTimeout(() => setValidationWarning(null), durationMs);
  };

  const editableInitialSnapshot = useMemo(() => normalizeSnapshot(initialState, false), [initialState]);
  const readonlyPreviousSnapshot = useMemo(
    () => normalizeSnapshot(previousEstado, true) || buildSnapshotFromHallazgos(previousHallazgos, true),
    [previousEstado, previousHallazgos]
  );

  // REHIDRATACIÓN: Cargar snapshot visual completo al estado local
  useEffect(() => {
    if (localChangesRef.current) return;

    // PRIORIDAD: value (hallazgos actuales) > editableInitialSnapshot > readonlyPreviousSnapshot
    let snapshot: OdontogramSnapshot | null = null;
    if (Array.isArray(value) && value.length > 0) {
      snapshot = buildSnapshotFromHallazgos(value, false);
    } else if (editableInitialSnapshot) {
      snapshot = editableInitialSnapshot;
    } else if (readonlyPreviousSnapshot) {
      snapshot = readonlyPreviousSnapshot;
    }

    if (!snapshot) return;

    const signature = JSON.stringify(snapshot.teethData);
    if (hydrationSignatureRef.current === signature) return;

    console.log('[ODONTO] Snapshot hidratado:', snapshot);
    hydrationSignatureRef.current = signature;
    setTeethData(snapshot.teethData);
    setActionHistory(snapshot.actionHistory || []);
    setUndoStack([]);
    setRedoStack([]);
    setIsLoaded(true);
  }, [editableInitialSnapshot, readonlyPreviousSnapshot, value]);
  
  // All visible teeth across all active arcadas
  const allVisibleTeeth = useMemo(() => {
    const { upper, lower, upperPrimary, lowerPrimary } = dentitionInfo;
    return [...upper, ...lower, ...(upperPrimary ?? []), ...(lowerPrimary ?? [])];
  }, [dentitionInfo]);

  // SNAPSHOT: índice de hallazgos de sesiones anteriores por diente
  const prevMarksByTooth = useMemo((): Record<string, Array<{ tool: string; face: string; toolLabel?: string; cie10?: string; sessionDate?: string }>> => {
    if (!previousHallazgos || !Array.isArray(previousHallazgos)) return {};
    const map: Record<string, any[]> = {};
    for (const h of previousHallazgos) {
      if (!h.diente || h.tipo === 'ausente') continue;
      if (!map[h.diente]) map[h.diente] = [];
      const tool = CLINICAL_TOOLS.find(t => t.id === h.tipo);
      map[h.diente].push({
        tool: h.tipo,
        face: h.superficie || '—',
        toolLabel: tool?.name ?? h.tipo,
        cie10: h.cie10 || tool?.cie10 || '',
        sessionDate: h.fechaRegistro ? new Date(h.fechaRegistro).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      });
    }
    return map;
  }, [previousHallazgos]);

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
    sanos: allVisibleTeeth.length - allVisibleTeeth.filter(n => teethData[n]?.ausente || teethData[n]?.marks?.length > 0).length,
    porEstado: STATES.map(state => ({
      ...state,
      count: Object.values(teethData).filter(t => t.marks?.some(m => m.state === state.id)).length
    }))
  };

  const getToothData = (num: string): ToothData => {
    return teethData[num] || createEmptyTooth(num);
  };

  // Manejar click en cara del diente 
  const handleFaceClick = (num: string, face: string) => {
    localChangesRef.current = true;
    const currentTooth = getToothData(num);
    const faceLocked = currentTooth.readonlyAusente || currentTooth.marks?.some((mark) => mark.face === face && mark.readonly);
    if (faceLocked) {
      showValidationWarning(`La pieza ${num} tiene memoria clinica ejecutada y solo lectura. Registra el cambio como un hallazgo nuevo en otra cara o en una nueva consulta.`);
      return;
    }

    const isAbsenceTool = activeTool === 'ausente' || activeTool === 'extraido';

    // CASO 0: AUTOMATIZACIÓN DE LIMPIEZA GENERAL
    if (activeTool === 'limpieza_general') {
      pushUndoSnapshot();
      const ts = Date.now();
      setActionHistory(prev => [{ type: 'automation-limpieza', tooth: 'general', timestamp: ts }, ...prev].slice(0, 20));
      setTeethData(prev => {
        const next = { ...prev };
        allVisibleTeeth.forEach((toothNum) => {
          const baseTooth = next[toothNum] || createEmptyTooth(toothNum);
          if (baseTooth.ausente || baseTooth.readonlyAusente) return;
          const targetFace: keyof FaceData = isAnteriorTooth(toothNum) ? 'vestibular' : 'oclusal';
          const hasMark = baseTooth.marks.some((m) => m.face === targetFace && (m.tool === 'profilaxis' || m.tool === 'limpieza_general'));
          if (hasMark) return;
          next[toothNum] = {
            ...baseTooth,
            faces: { ...baseTooth.faces, [targetFace]: COLORS.sellante },
            marks: [
              ...baseTooth.marks,
              {
                id: `hgo_${toothNum}_${targetFace}_limpieza_general_${ts}`,
                face: targetFace,
                tool: 'limpieza_general',
                state: activeState,
                proceso: processMode,
                timestamp: ts,
              },
            ],
          };
        });
        return next;
      });
      return;
    }
    
    // CASO 1: HERRAMIENTA "AUSENTE" — toggle sin validación anatómica
    if (isAbsenceTool) {
      if (currentTooth.readonlyAusente) {
        showValidationWarning(`La ausencia historica de la pieza ${num} esta bloqueada como memoria evolutiva.`);
        return;
      }
      pushUndoSnapshot();
      const newAction = { type: 'toggle-ausente', tooth: num, timestamp: Date.now() };
      setActionHistory(prev => [newAction, ...prev].slice(0, 20));
      setTeethData(prev => {
        const current = prev[num] || createEmptyTooth(num);
        // Al marcar ausente, limpiar cualquier marca previa del diente
        const nextAusente = !current.ausente;
        return { ...prev, [num]: { ...current, ausente: nextAusente, marks: nextAusente ? [] : current.marks,
          faces: nextAusente ? createEmptyFaces() : current.faces } };
      });
      return;
    }

    // CASO 2: HERRAMIENTAS CLÍNICAS (Resina, caries, etc)
    // ── VALIDACIÓN ANATÓMICA ──────────────────────────────────────
    const validation = validateMark(num, face, activeTool, currentTooth.ausente);
    if (validation.blocked) {
      showValidationWarning(validation.message);
      return;
    }
    // Advertencias no bloqueantes (ej. cordal + bracket)
    if (validation.message) showValidationWarning(validation.message, 4000);
    // ─────────────────────────────────────────────────────────────

    const paintColor = currentToolObj.color;
    const existingMark = currentTooth.marks?.find(m => m.face === face && m.tool === activeTool);
    
    if (existingMark) {
      if (existingMark.readonly) {
        showValidationWarning(`La marca historica ${currentToolObj.name} en la pieza ${num} es solo lectura.`);
        return;
      }
      pushUndoSnapshot();
      // TOGGLE DELETE: clic sobre marca existente → la elimina y resetea el color
      const newAction = { type: 'unmark', tooth: num, face, tool: activeTool, timestamp: Date.now() };
      setActionHistory(prev => [newAction, ...prev].slice(0, 20));
      setTeethData(prev => {
        const current = prev[num] || createEmptyTooth(num);
        const remainingMarks = current.marks.filter(m => !(m.face === face && m.tool === activeTool));
        // Calcular color correcto para la cara: si otra herramienta la pintó también, usar el último color de esa marca; si no, healthy
        const lastColorForFace = remainingMarks
          .filter(m => m.face === face)
          .slice(-1)[0];
        const faceColor = lastColorForFace
          ? (CLINICAL_TOOLS.find(t => t.id === lastColorForFace.tool)?.color ?? COLORS.healthy)
          : COLORS.healthy;
        return {
          ...prev,
          [num]: { ...current, faces: { ...current.faces, [face]: faceColor }, marks: remainingMarks }
        };
      });
      return;
    }
    
    // MARCA NUEVA
    pushUndoSnapshot();
    const ts = Date.now();
    setActionHistory(prev => [{ type: 'mark', tooth: num, face, tool: activeTool, state: activeState,
      cie10: (currentToolObj as any).cie10, cdt: (currentToolObj as any).cdt, proceso: processMode, timestamp: ts }, ...prev].slice(0, 20));
    setTeethData(prev => {
      const current = prev[num] || createEmptyTooth(num);
      return {
        ...prev,
        [num]: {
          ...current,
          faces: { ...current.faces, [face]: paintColor },
          marks: [...(current.marks || []), {
            id: `hgo_${num}_${face}_${activeTool}_${ts}`.replace(/\s+/g, '_').toLowerCase(),
            face, tool: activeTool, state: activeState, proceso: processMode, timestamp: ts
          }]
        }
      };
    });
  };

  const clearAll = () => setShowClearConfirm(true);

  const exportData = () => {
    const allHallazgos = Object.values(teethData).flatMap(tooth =>
      (tooth.marks || []).map(mark => ({
        id: mark.id,
        diente: tooth.number,
        tipo: mark.tool,
        superficie: mark.face,
        descripcion: `${mark.tool} en ${tooth.number} (${mark.face})`,
        severidad: mark.state,
        fechaRegistro: new Date(mark.timestamp).toISOString(),
        cie10: (CLINICAL_TOOLS.find(t => t.id === mark.tool)?.cie10) || '',
        cdt: (CLINICAL_TOOLS.find(t => t.id === mark.tool)?.cdt) || '',
      }))
    );
    const dataStr = JSON.stringify({ hallazgos: allHallazgos, teethData, actionHistory }, null, 2);
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
      localChangesRef.current = true;
      pushUndoSnapshot();
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setTeethData(data.teethData || {});
          setActionHistory(data.actionHistory || []);
        } catch {
          setImportError('El archivo no es un odontograma válido.');
          setTimeout(() => setImportError(null), 4000);
        }
      };
      reader.readAsText(file);
    }
  };

  // Atajos de teclado para estados
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') setActiveState('realizado');
      if (e.ctrlKey && e.key === '2') setActiveState('pendiente');
      if (e.ctrlKey && e.key === '3') setProcessMode((prev) => !prev);
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleUndo]);

  // 🚀 SINCRONIZACIÓN: Avisar al padre para guardar en Supabase
  // Usamos un Ref para comparar y evitar que el Padre se vuelva loco
  const lastUpdateRef = React.useRef("");

  useEffect(() => {
    // Exportar absolutamente todos los hallazgos y herramientas, sin filtrar nada
    const hallazgosExportar: any[] = [];
    const snapshot: OdontogramSnapshot = {
      teethData,
      actionHistory,
      hydratedFromPrevious: Boolean(readonlyPreviousSnapshot && !editableInitialSnapshot),
      sourceDate: readonlyPreviousSnapshot?.sourceDate || null,
    };

    Object.values(teethData).forEach(diente => {
      // Exportar estado ausente
      if (diente.ausente) {
        hallazgosExportar.push({
          id: `aus-${diente.number}`,
          diente: diente.number, tipo: 'extraido',
          descripcion: 'Diente ausente', fechaRegistro: new Date().toISOString()
        });
      }
      // Exportar todas las marcas/herramientas
      if (Array.isArray(diente.marks)) {
        diente.marks.forEach(marca => {
          hallazgosExportar.push({
            id: marca.id || `hgo_${diente.number}_${marca.tool}_${marca.face}`.replace(/\s+/g, '_').toLowerCase(),
            diente: diente.number, tipo: marca.tool,
            superficie: marca.face, severidad: marca.state,
            proceso: Boolean(marca.proceso),
            cie10: CLINICAL_TOOLS.find(t => t.id === marca.tool)?.cie10 ?? '',
            cdt: CLINICAL_TOOLS.find(t => t.id === marca.tool)?.cdt ?? '',
            descripcion: `Cara ${marca.face}${marca.proceso ? ' · en proceso' : ''}`,
            fechaRegistro: new Date(marca.timestamp).toISOString()
          });
        });
      }
    });

    // Siempre avisar al padre (sin válvula de seguridad)
    if (onChange) onChange(hallazgosExportar);
    if (onUpdate) onUpdate(hallazgosExportar, snapshot);
    if (onHistoryChange) onHistoryChange(hallazgosExportar);

  }, [actionHistory, editableInitialSnapshot, onChange, onHistoryChange, onUpdate, readonlyPreviousSnapshot, teethData]);

  return (
    <>
    <ConfirmDialog
      isOpen={showClearConfirm}
      title="Limpiar odontograma"
      message="Se borrarán todas las marcas editables. Puedes recuperarlas con Deshacer."
      confirmLabel="Limpiar todo"
      cancelLabel="Cancelar"
      variant="danger"
      onConfirm={() => {
        localChangesRef.current = true;
        pushUndoSnapshot();
        setTeethData((prev) => {
          const preservedEntries: Array<[string, ToothData]> = (Object.entries(prev) as Array<[string, ToothData]>)
          .map(([num, tooth]) => {
            const lockedMarks = tooth.marks.filter((mark) => mark.readonly);
            const rebuiltFaces = createEmptyFaces();
            lockedMarks.forEach((mark) => {
              const tool = CLINICAL_TOOLS.find((entry) => entry.id === mark.tool);
              if (tool) rebuiltFaces[mark.face as keyof FaceData] = tool.color;
            });
            if (tooth.readonlyAusente) {
              return [num, { ...tooth, faces: createEmptyFaces(), marks: [], ausente: true, readonlyAusente: true }];
            }
            if (lockedMarks.length) {
              return [num, { ...tooth, faces: rebuiltFaces, marks: lockedMarks, ausente: false }];
            }
            return [num, createEmptyTooth(num)];
          });

          return Object.fromEntries(
            preservedEntries.filter(([, tooth]) => tooth.ausente || tooth.marks.length > 0)
          );
        });
        setActionHistory((prev) => prev.filter((action) => action.readonly));
        setShowClearConfirm(false);
      }}
      onCancel={() => setShowClearConfirm(false)}
    />
    {importError && (
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
        padding: '12px 16px', color: '#b91c1c', fontSize: 13, fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxWidth: 320,
      }}>
        {importError}
      </div>
    )}
    {validationWarning && (
      <div style={{
        position: 'fixed', top: 70, right: 20, zIndex: 9999,
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: 12, padding: '14px 18px',
        color: '#92400e',
        fontSize: 13, fontWeight: 600,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxWidth: 380,
        animation: 'fadeIn 0.2s ease-out',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <AlertCircle size={16} />
        <span>{validationWarning}</span>
      </div>
    )}
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      width: '100%',
      background: COLORS.cardBg,
      borderRadius: '20px',
      overflow: 'hidden',
      border: `1px solid ${COLORS.border}`,
      boxShadow: COLORS.shadowXl,
      color: COLORS.text
    }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(75,85,99,0.3)); }
          50% { filter: drop-shadow(0 0 6px rgba(75,85,99,0.5)); }
        }
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes toolHover {
          0% { transform: translateX(0); }
          100% { transform: translateX(6px); }
        }
        .ortho-tooth {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .ortho-tooth:hover {
          transform: scale(1.1) translateY(-4px);
          z-index: 30;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15));
        }
        .ortho-tooth-selected {
          animation: pulse 1.5s ease-in-out infinite, glowPulse 1.5s ease-in-out infinite;
          animation-fill-mode: both;
        }
        .state-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .state-btn:hover {
          transform: translateY(-2px);
          box-shadow: ${COLORS.shadowMd};
        }
        .tool-btn {
          transition: all 0.2s ease;
        }
        .tool-btn:hover {
          animation: toolHover 0.3s ease forwards;
          background: ${COLORS.secondaryLight} !important;
          box-shadow: ${COLORS.shadowSm};
        }
        .dashboard-card {
          animation: fadeInUp 0.3s ease-out;
          transition: all 0.2s ease;
        }
        .dashboard-card:hover {
          transform: translateY(-3px);
          box-shadow: ${COLORS.shadowLg};
          border-color: ${COLORS.primary}30 !important;
        }
        .animate-fadeIn {
          animation: fadeInUp 0.3s ease-out;
        }
        .glass-panel {
          background: ${COLORS.cardBg};
          border: 1px solid ${COLORS.border};
          box-shadow: ${COLORS.shadowLg};
        }
        .odontogram-container {
          overflow-x: auto;
          overflow-y: visible;
          scrollbar-width: thin;
        }
        .odontogram-container::-webkit-scrollbar {
          height: 6px;
        }
        .odontogram-container::-webkit-scrollbar-track {
          background: ${COLORS.secondaryLight};
          border-radius: 3px;
        }
        .odontogram-container::-webkit-scrollbar-thumb {
          background: ${COLORS.borderDark};
          border-radius: 3px;
        }
        .odontogram-container::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.textLight};
        }
      `}</style>

      {/* Header visual igual a Ortho */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.secondaryLight} 0%, ${COLORS.cardBg} 100%)`,
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: `1px solid ${COLORS.border}`,
        boxShadow: COLORS.shadowMd
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: COLORS.primaryLight, padding: '10px', borderRadius: '12px', boxShadow: COLORS.shadowSm }}>
            <LayoutGrid size={20} color={COLORS.primary} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: COLORS.primaryDark }}>Odontograma General</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: COLORS.textLight }}>Gestion visual clinica</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowHelp(!showHelp)} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', color: COLORS.text }}>
            <Info size={16} />
          </button>
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: COLORS.errorLight, border: `1px solid ${COLORS.error}40`, color: COLORS.error, borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: COLORS.shadowSm }}>
            <Trash size={14} /> Limpiar
          </button>
        </div>
      </div>

      {/* Barra de estados igual a Ortho */}
      <div style={{
        padding: '12px 24px',
        background: COLORS.secondaryLight,
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATES.map(state => (
            <button
              key={state.id}
              className="state-btn"
              onClick={() => setActiveState(state.id)}
              title={state.longDescription}
              style={{
                padding: '8px 18px',
                background: activeState === state.id ? state.color : COLORS.cardBg,
                color: activeState === state.id ? '#FFFFFF' : state.color,
                border: `2px solid ${state.color}`,
                borderRadius: '30px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeState === state.id ? `0 2px 8px ${state.color}40` : COLORS.shadowSm
              }}
            >
              <state.icon size={14} />
              {state.name}
            </button>
          ))}
          <button
            className="state-btn"
            onClick={() => setProcessMode((prev) => !prev)}
            title="Marca el hallazgo como procedimiento en seguimiento"
            style={{
              padding: '8px 18px',
              background: processMode ? COLORS.proceso : COLORS.cardBg,
              color: processMode ? '#FFFFFF' : COLORS.proceso,
              border: `2px solid ${COLORS.proceso}`,
              borderRadius: '30px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: processMode ? `0 2px 8px ${COLORS.proceso}40` : COLORS.shadowSm
            }}
          >
            <Clock size={14} />
            Proceso
          </button>
          <button
            className="state-btn"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Deshacer último cambio"
            style={{
              padding: '8px 12px',
              background: COLORS.cardBg,
              color: undoStack.length === 0 ? COLORS.textMuted : COLORS.text,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '10px',
              cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
              opacity: undoStack.length === 0 ? 0.5 : 1,
            }}
          >
            <Undo size={14} />
          </button>
          <button
            className="state-btn"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Rehacer último cambio"
            style={{
              padding: '8px 12px',
              background: COLORS.cardBg,
              color: redoStack.length === 0 ? COLORS.textMuted : COLORS.text,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '10px',
              cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
              opacity: redoStack.length === 0 ? 0.5 : 1,
            }}
          >
            <Redo size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: COLORS.cardBg, padding: '6px 12px', borderRadius: '30px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadowSm }}>
          <TrendingUp size={14} color={COLORS.success} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textLight }}>Denticion:</span>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}`, background: COLORS.cardBg }}>
            {(['adult','primary','mixed'] as DentitionMode[]).map(mode => {
              const info = DENTITION_SETS[mode];
              const isActive = dentitionMode === mode;
              const isAuto = autoDentitionMode === mode && dentitionOverride === null;
              return (
                <button
                  key={mode}
                  onClick={() => setDentitionOverride(dentitionOverride === mode ? null : mode)}
                  title={info.description + (isAuto ? ' (detectado automáticamente)' : '')}
                  style={{
                    padding: '6px 10px',
                    background: isActive ? info.color : 'transparent',
                    color: isActive ? '#fff' : COLORS.text,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    display: 'flex', alignItems: 'center', gap: 5,
                    borderRight: mode !== 'mixed' ? `1px solid ${COLORS.border}` : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{info.label}</span>
                  {isAuto && <span style={{ fontSize: 9, opacity: 0.8, background: 'rgba(255,255,255,0.3)', borderRadius: 4, padding: '1px 4px' }}>AUTO</span>}
                </button>
              );
            })}
          </div>
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
            <div>• <strong>Ctrl+1:</strong> Revision actual</div>
            <div>• <strong>Ctrl+2:</strong> Pendiente</div>
            <div>• <strong>Ctrl+3:</strong> Proceso ON/OFF</div>
            <div>• <strong>Ctrl+Z / Ctrl+Y:</strong> Deshacer / Rehacer</div>
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
      <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
        
        {/* ===== COLUMNA IZQUIERDA: HERRAMIENTAS ===== */}
        <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Buscador de herramientas */}
          <div className="dashboard-card" style={{ background: COLORS.cardBg, borderRadius: '14px', border: `1px solid ${COLORS.border}`, padding: '12px', boxShadow: COLORS.shadowLg }}>
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
          <div className="dashboard-card" style={{ background: COLORS.cardBg, borderRadius: '14px', border: `1px solid ${COLORS.border}`, padding: '12px', boxShadow: COLORS.shadowLg }}>
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
          <div className="dashboard-card" style={{ 
            background: COLORS.cardBg,
            borderRadius: '14px', 
            border: `2px solid ${currentToolObj.color}`,
            padding: '14px',
            boxShadow: COLORS.shadowLg
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
                  Estado: {STATES.find(s => s.id === activeState)?.name}{processMode ? ' · Proceso' : ''}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: COLORS.text }}>{currentToolObj.description}</div>
            {/* CIE-10 / CDT Badges */}
            {((currentToolObj as any).cie10 || (currentToolObj as any).cdt) && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(currentToolObj as any).cie10 && (currentToolObj as any).cie10 !== '—' && (
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>
                    CIE-10: {(currentToolObj as any).cie10}
                  </span>
                )}
                {(currentToolObj as any).cdt && (currentToolObj as any).cdt !== '—' && (
                  <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>
                    CDT: {(currentToolObj as any).cdt}
                  </span>
                )}
              </div>
            )}
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

          {/* Panel de Historial Previo — visible cuando hay un diente seleccionado con historia */}
          {selectedTooth && prevMarksByTooth[selectedTooth]?.length > 0 && (
            <div className="dashboard-card" style={{ background: COLORS.cardBg, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: COLORS.shadowLg }}>
              <div style={{ background: '#64748b', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="white" />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Historial — Diente {selectedTooth}</span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prevMarksByTooth[selectedTooth].map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#334155' }}>{m.toolLabel}</div>
                      <div style={{ color: '#64748b' }}>Cara: {m.face}{m.cie10 ? ` · ${m.cie10}` : ''}</div>
                      {m.sessionDate && <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{m.sessionDate}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de herramientas filtradas */}
          <div style={{ 
            background: COLORS.cardBg,
            borderRadius: '14px', 
            border: `1px solid ${COLORS.border}`,
            maxHeight: '400px',
            overflow: 'auto',
            boxShadow: COLORS.shadowLg
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
                  className="tool-btn"
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ── BANNER AUTO-DENTICIÓN ── */}
          {autoDentitionMode !== 'adult' && (
            <div style={{
              background: autoDentitionMode === 'primary' ? '#fef9c3' : '#f0fdf4',
              border: `1px solid ${autoDentitionMode === 'primary' ? '#fde68a' : '#bbf7d0'}`,
              borderRadius: 10, padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
              color: autoDentitionMode === 'primary' ? '#92400e' : '#14532d'
            }}>
              <Info size={18} />
              <span>
                <strong>Dentición {autoDentitionMode === 'primary' ? 'Temporal' : 'Mixta'} detectada</strong>
                {patientAge !== null && <> — paciente de <strong>{patientAge} años</strong></>}.
                {' '}{dentitionOverride === null ? 'El modo se ajustó automáticamente.' : `Modo manual activo (${DENTITION_SETS[dentitionMode].label}).`}
              </span>
              {dentitionOverride !== null && (
                <button
                  onClick={() => setDentitionOverride(null)}
                  style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', border: '1px solid currentColor', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                >Restaurar auto</button>
              )}
            </div>
          )}

          {/* LIENZO DEL ODONTOGRAMA */}
          <div className="odontogram-container" style={{ 
            background: COLORS.cardBg,
            borderRadius: '18px',
            border: `1.5px solid ${COLORS.border}`,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            alignItems: 'center',
            overflowX: 'auto',
            boxShadow: COLORS.shadowXl
          }}>
            {/* Helper: render one row of teeth */}
            {((): React.ReactElement[] => {
              const { upper, lower, upperPrimary, lowerPrimary, midline, midlinePrimary } = dentitionInfo;
              const isMixed = dentitionMode === 'mixed';
              const isPrimaryMode = dentitionMode === 'primary';

              const renderRow = (teeth: string[], midlineAt: number, label: string, prim: boolean) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 1000, margin: '0 auto', overflow: 'visible' }}>
                  {(isMixed || isPrimaryMode) && (
                    <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: prim ? '#f59e0b' : COLORS.primary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {label}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap', width: 'auto', overflow: 'visible' }}>
                    {teeth.map((num, index) => {
                      const data = getToothData(num);
                      const anterior = isAnteriorTooth(num);
                      return (
                        <React.Fragment key={num}>
                          {index === midlineAt && (
                            <div style={{ width: 2, background: '#cbd5e1', margin: '0 8px', borderRadius: 2, alignSelf: 'stretch' }} />
                          )}
                          <ToothGraphic
                            number={num} faces={data.faces} ausente={data.ausente}
                            onFaceClick={(face: string) => handleFaceClick(num, face)}
                            hasMark={data.marks?.length > 0}
                            isSelected={selectedTooth === num}
                            onSelect={() => setSelectedTooth(prev => prev === num ? null : num)}
                            isAnterior={anterior}
                            isPrimary={prim}
                            previousMarks={prevMarksByTooth[num]}
                            isReadonly={Boolean(getToothData(num).readonlyAusente || getToothData(num).marks.some((mark) => mark.readonly))}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );

              const rows: React.ReactElement[] = [];

              rows.push(renderRow(upper, midline, 'Permanentes superiores (11-28)', false));
              if (isMixed && upperPrimary) {
                rows.push(<div key="divU" style={{ width: '80%', height: 1, background: 'linear-gradient(90deg,transparent,#fde68a,transparent)', margin: '0 auto' }} />);
                rows.push(renderRow(upperPrimary, midlinePrimary ?? 5, 'Temporales superiores (55-65)', true));
              }

              // Central midline separator between upper and lower halves
              rows.push(<div key="midline" style={{ width: '80%', height: 2, background: 'linear-gradient(90deg,transparent,#e2e8f0,transparent)', margin: '0 auto' }} />);

              if (isMixed && lowerPrimary) {
                rows.push(renderRow(lowerPrimary, midlinePrimary ?? 5, 'Temporales inferiores (85-75)', true));
                rows.push(<div key="divL" style={{ width: '80%', height: 1, background: 'linear-gradient(90deg,transparent,#fde68a,transparent)', margin: '0 auto' }} />);
              }
              rows.push(renderRow(lower, midline, 'Permanentes inferiores (48-38)', false));

              return rows;
            })()}
          </div>

          {/* DASHBOARD CLÍNICO */}
          <div style={{ 
            background: COLORS.cardBg,
            borderRadius: '14px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px',
            boxShadow: COLORS.shadowLg
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
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{allVisibleTeeth.length}</div>
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
                          boxShadow: '0 2px 6px rgba(51,65,85,0.12)'
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
                              Diente {accion.tooth} - Cara {accion.face} • {estado?.name || ''}{accion.proceso ? ' · Proceso' : ''}
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
                          boxShadow: '0 2px 6px rgba(51,65,85,0.12)'
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
                    else if (accion.type === 'automation-limpieza') {
                      return (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '8px',
                          border: `1px solid ${COLORS.primary}40`,
                          boxShadow: '0 2px 6px rgba(51,65,85,0.12)'
                        }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: COLORS.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Sparkles size={16} color="white" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.primary }}>Limpieza general automatizada</div>
                            <div style={{ fontSize: '11px', color: COLORS.textLight }}>
                              Aplicada sobre piezas disponibles
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
        background: COLORS.secondaryLight,
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
            style={{ padding: '8px 16px', background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', boxShadow: COLORS.shadowSm }}
          >
            <Download size={14} /> Exportar
          </button>
          <label style={{ padding: '8px 16px', background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', boxShadow: COLORS.shadowSm }}>
            <Upload size={14} /> Importar
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </div>
    </>
  );
};