import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { ConfirmDialog } from '../../../shared/components/Toast';
import { 
  Activity, X, Circle, Square, Triangle, Zap, Bone,
  CheckCircle, AlertCircle, FileText, Trash, RefreshCw,
  Info, Brush, Link, LayoutGrid, AlertTriangle, MousePointer2, 
  MinusCircle, Undo, Redo, PieChart, Layers, ClipboardList,
  ArrowLeft, ArrowRight, TrendingUp, Wrench, Target, Shield,
  Sparkles, Camera, MoveHorizontal, Scan
} from 'lucide-react';

// ============================================
// 1. CONFIGURACIÓN - VIBE GRIS PREMIUM
// ============================================

const COLORS = {
  // Solo estos colores se usan en herramientas dentro de dientes
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
  
  // Estados en grises
  instalado: '#2563EB',
  recementado: '#9CA3AF',
  fracturado: '#D1D5DB',
  retirado: '#E5E7EB',
  ausente: '#F3F4F6',
  
  // Paleta de grises
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
  
  // Sombras puras
  shadowSm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  shadowXl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  shadowInner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

const STORAGE_KEY = 'ortho_odontogram_state';

// ============================================
// ANIMACIONES CSS GLOBALES
// ============================================
const animationStyles = `
  @keyframes smoothColorTransition {
    from { fill: rgba(250, 250, 250, 0.5); }
    to { fill: currentColor; }
  }
  
  @keyframes slideInFace {
    0% { 
      opacity: 0;
      fill: rgba(250, 250, 250, 0.3);
    }
    100% {
      opacity: 1;
      fill: currentColor;
    }
  }
  
  @keyframes pulseGlow {
    0%, 100% { 
      filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.4));
      opacity: 0.9;
    }
    50% {
      filter: drop-shadow(0 0 10px rgba(220, 38, 38, 0.7));
      opacity: 1;
    }
  }
  
  @keyframes breathingPulse {
    0%, 100% {
      r: 8;
      opacity: 0.8;
    }
    50% {
      r: 10;
      opacity: 1;
    }
  }
  
  @keyframes subtleFloat {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-2px);
    }
  }
  
  @keyframes glowWave {
    0%, 100% {
      filter: drop-shadow(0 0 2px rgba(2, 132, 199, 0.3));
      opacity: 0.7;
    }
    50% {
      filter: drop-shadow(0 0 12px rgba(2, 132, 199, 0.8));
      opacity: 1;
    }
  }
  
  @keyframes rightLeftShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }
  
  @keyframes fadeInScale {
    0% {
      opacity: 0;
      r: 0;
    }
    50% {
      r: 10;
    }
    100% {
      opacity: 1;
      r: 8;
    }
  }
  
  @keyframes scanningPulse {
    0%, 100% {
      stroke-width: 1;
      opacity: 0.5;
    }
    50% {
      stroke-width: 2;
      opacity: 1;
    }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideOutDown {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(20px);
    }
  }

  @keyframes pulseScale {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9;
    }
  }

  .success-toast {
    animation: slideInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
    pointer-events: auto;
  }

  .success-toast-exit {
    animation: slideOutDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
  }
`;

// Inyectar estilos de animación
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = animationStyles;
  document.head.appendChild(styleEl);
}

const STATES = [
  { id: 'instalado', name: 'Instalado', color: COLORS.instalado, icon: CheckCircle, tooltip: 'Modo de colocación: instala herramientas en el diente seleccionado' },
  { id: 'recementado', name: 'Recementado', color: '#EF4444', icon: AlertCircle, tooltip: 'Marca bracket despegado: genera hallazgo clínico y programa recementado. El diente se torna rojo en el odontograma' },
  { id: 'retirado', name: 'Retirado', color: COLORS.retirado, icon: MinusCircle, tooltip: 'Retira herramienta del diente y lo documenta en el resumen clínico de la sesión' }
];

const CLINICAL_TOOLS = [
  { id: 'bracket_metal', name: 'Bracket Metalico', icon: Square, type: 'base', color: COLORS.bracketMetal, colorLight: '#EBF4FF', category: 'Bases' },
  { id: 'bracket_zafiro', name: 'Bracket Estetico', icon: Square, type: 'base', color: COLORS.bracketZafiro, colorLight: '#F7FAFC', category: 'Bases' },
  { id: 'bracket_autoligable', name: 'Autoligable', icon: Square, type: 'base', color: COLORS.bracketAutoligable, colorLight: '#EBF8FF', category: 'Bases' },
  { id: 'tubo', name: 'Tubo Molar', icon: Circle, type: 'base', color: COLORS.tubo, colorLight: '#FFF5F5', category: 'Bases' },
  { id: 'banda', name: 'Banda Ortodontica', icon: Circle, type: 'base', color: COLORS.banda, colorLight: '#FFFAF0', category: 'Bases' },
  { id: 'modulo', name: 'Modulo', icon: Circle, type: 'auxiliar', color: COLORS.modulo, colorLight: '#FFF5F5', category: 'Auxiliares' },
  { id: 'ligadura_metalica', name: 'Ligadura Metalica', icon: X, type: 'auxiliar', color: COLORS.ligadura, colorLight: '#F7FAFC', category: 'Auxiliares' },
  { id: 'boton', name: 'Boton', icon: Circle, type: 'auxiliar', color: COLORS.boton, colorLight: '#F0FFF4', category: 'Auxiliares' },
  { id: 'bite_turbo', name: 'Bite Turbo', icon: Triangle, type: 'auxiliar', color: COLORS.biteTurbo, colorLight: '#FFFAF0', category: 'Auxiliares' },
  { id: 'arco_niti', name: 'Arco NiTi', icon: Link, type: 'conexion', color: COLORS.arco, colorLight: '#EBF8FF', category: 'Sistemas' },
  { id: 'arco_acero', name: 'Arco Acero', icon: Link, type: 'conexion', color: COLORS.primary, colorLight: '#EDF2F7', category: 'Sistemas' },
  { id: 'cadeneta', name: 'Cadeneta', icon: Link, type: 'conexion', color: COLORS.cadeneta, colorLight: '#FAF5FF', category: 'Sistemas' },
  { id: 'resorte', name: 'Resorte', icon: Link, type: 'conexion', color: COLORS.resorte, colorLight: '#F7FAFC', category: 'Sistemas' },
  { id: 'ausente', name: 'Extraido/Ausente', icon: X, type: 'estado', color: COLORS.ausente, colorLight: '#EDF2F7', category: 'Dental' },
  // ── HERRAMIENTAS DIAGNÓSTICAS (Módulo Diamond) ────────────────────
  { id: 'dolor', name: 'Dolor / Sintomático', icon: Zap, type: 'diagnostico', color: '#DC2626', colorLight: '#FEF2F2', category: 'Diagnóstico' },
  { id: 'movil', name: 'Movilidad Dental', icon: MoveHorizontal, type: 'diagnostico', color: '#7C3AED', colorLight: '#F5F3FF', category: 'Diagnóstico' },
  { id: 'rx_req', name: 'Requiere RX / Imagen', icon: Camera, type: 'diagnostico', color: '#0284C7', colorLight: '#F0F9FF', category: 'Diagnóstico' },
];

interface FaceData {
  color: string;
  base?: { id: string; state: string } | null;
  auxiliares?: Array<{ id: string; state: string }>;
}

interface OrthoTooth {
  number: string;
  ausente: boolean;
  faces: {
    oclusal: FaceData;
    vestibular: FaceData;
    lingual: FaceData;
    mesial: FaceData;
    distal: FaceData;
  };
  // Marcadores diagnósticos (Módulo Diamond)
  diagnosticos?: {
    dolor?: boolean;
    movil?: boolean;
    rx_req?: boolean;
    notas?: string;
  };
  // Legacy support
  base?: { id: string; state: string } | null;
  auxiliares?: Array<{ id: string; state: string }>;
}

interface Connection { id: string; toolId: string; teeth: string[]; state: string; timestamp: number; }
interface HistoryState { teethData: Record<string, OrthoTooth>; connections: Connection[]; }

type ClasifKind = 'base' | 'aux' | 'sistema' | 'ausente' | 'falla';

interface ClasifItem {
  id: string;
  kind: ClasifKind;
  title: string;
  subtitle: string;
  color: string;
  teeth: string[];
  toolId?: string;
  faceName?: string;
}

// Helper para crear cara vacía
const createEmptyFace = (): FaceData => ({
  color: '#FAFAFA',
  base: null,
  auxiliares: []
});

// Helper para crear diente vacío con faces
const createEmptyTooth = (number: string): OrthoTooth => ({
  number,
  ausente: false,
  faces: {
    oclusal: createEmptyFace(),
    vestibular: createEmptyFace(),
    lingual: createEmptyFace(),
    mesial: createEmptyFace(),
    distal: createEmptyFace()
  }
});

const cloneFace = (face?: FaceData): FaceData => ({
  color: face?.color || '#FAFAFA',
  base: face?.base ? { ...face.base } : null,
  auxiliares: Array.isArray(face?.auxiliares) ? face!.auxiliares!.map((aux) => ({ ...aux })) : [],
});

const cloneTooth = (tooth?: OrthoTooth, numberFallback = ''): OrthoTooth => {
  const source = tooth || createEmptyTooth(numberFallback);
  return {
    ...source,
    base: source.base ? { ...source.base } : source.base ?? null,
    auxiliares: Array.isArray(source.auxiliares) ? source.auxiliares.map((aux) => ({ ...aux })) : [],
    diagnosticos: source.diagnosticos ? { ...source.diagnosticos } : {},
    faces: {
      oclusal: cloneFace(source.faces?.oclusal),
      vestibular: cloneFace(source.faces?.vestibular),
      lingual: cloneFace(source.faces?.lingual),
      mesial: cloneFace(source.faces?.mesial),
      distal: cloneFace(source.faces?.distal),
    },
  };
};

const CACHED_EMPTY_TEETH: Record<string, OrthoTooth> = [
  '18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28',
  '48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38',
].reduce((acc, number) => {
  acc[number] = createEmptyTooth(number);
  return acc;
}, {} as Record<string, OrthoTooth>);

// ============================================
// 2. DIENTE CON 5 CARAS CLICKEABLES
// ============================================

const ToothGraphic = React.memo(({ number, data, isSelected, onFaceClick, isWireActive, isChainActive, isSpringActive }: any) => {
  // Detectar fallas pendientes (recementado pendiente)
  const hasFalla = data?.faces ? Object.values(data.faces).some((face: any) => 
    face.base?.state === 'recementado'
  ) : false;
  // Detectar si fue recementado en esta sesión (visual de cementado fresco)
  const hasRecementadoEjecutado = data?.faces ? Object.values(data.faces).some((face: any) =>
    face.base?.state === 'recementado_ejecutado'
  ) : false;
  const hasRxRequest = Boolean(data?.diagnosticos?.rx_req) && !data?.ausente;

  // Colores de las caras
  const faces = data?.faces || {
    oclusal: createEmptyFace(),
    vestibular: createEmptyFace(),
    lingual: createEmptyFace(),
    mesial: createEmptyFace(),
    distal: createEmptyFace()
  };

  // Detectar si alguna cara tiene base
  const hasBaseOnAnyFace = Object.values(faces).some((face: any) => face.base !== null && face.base !== undefined);
  const hasAuxOnAnyFace = Object.values(faces).some((face: any) => Array.isArray(face.auxiliares) && face.auxiliares.length > 0);
  const connectionY = faces.vestibular?.base ? 24 : (faces.lingual?.base ? 76 : 50);
  const facePositions: Record<string, { x: number; y: number }> = {
    vestibular: { x: 50, y: 24 },
    lingual: { x: 50, y: 76 },
    mesial: { x: 24, y: 50 },
    distal: { x: 76, y: 50 },
    oclusal: { x: 50, y: 50 }
  };

  const getStateStroke = (state?: string) => {
    if (state === 'recementado') return COLORS.error;
    if (state === 'recementado_ejecutado') return '#FFFFFF';
    if (state === 'retirado') return COLORS.textMuted;
    return undefined;
  };

  const getStateFill = (state: string | undefined, tool: any) => {
    if (state === 'recementado') return '#FEE2E2';
    if (state === 'recementado_ejecutado') return '#FFFFFF';
    if (state === 'retirado') return '#E5E7EB';
    return tool?.color || COLORS.primary;
  };

  const renderBaseOnFace = (faceName: string, faceData: any) => {
    if (!faceData?.base) return null;

    const pos = facePositions[faceName];
    const tool = CLINICAL_TOOLS.find(t => t.id === faceData.base.id);
    const strokeColor = getStateStroke(faceData.base.state) || tool?.color || COLORS.primary;
    const fillColor = getStateFill(faceData.base.state, tool);

    if (!pos || !tool) return null;

    const isRecementadoEjecutado = faceData.base.state === 'recementado_ejecutado';

    if (tool.id === 'tubo' || tool.id === 'banda') {
      return (
        <g key={`base-${faceName}`} transform={`translate(${pos.x}, ${pos.y})`} pointerEvents="none">
          <ellipse cx="0" cy="0" rx="8.5" ry="7" fill={fillColor} stroke={strokeColor} strokeWidth="2.2" />
          <ellipse cx="0" cy="0" rx="4" ry="2.8" fill="#FFFFFF" opacity={isRecementadoEjecutado ? 0.15 : 0.35} />
          {isRecementadoEjecutado && (
            <text x="0" y="3" textAnchor="middle" fontSize="6" fill="#6EE7B7" fontWeight="900">✓</text>
          )}
        </g>
      );
    }

    return (
      <g key={`base-${faceName}`} transform={`translate(${pos.x}, ${pos.y})`} pointerEvents="none">
        <rect x="-7.5" y="-7.5" width="15" height="15" rx={tool.id === 'bracket_autoligable' ? 4.5 : 3.5} fill={fillColor} stroke={strokeColor} strokeWidth="2.2" />
        {isRecementadoEjecutado ? (
          // Visual de cementado fresco: ranura plateada + check verde
          <>
            <line x1="-5.4" y1="0" x2="5.4" y2="0" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <text x="0" y="3.5" textAnchor="middle" fontSize="7" fill="#6EE7B7" fontWeight="900">✓</text>
          </>
        ) : (
          <>
            <line x1="-5.4" y1="0" x2="5.4" y2="0" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <line x1="-5.4" y1="0" x2="5.4" y2="0" stroke={strokeColor} strokeWidth="0.9" strokeLinecap="round" opacity="0.9" />
            {tool.id === 'bracket_autoligable' && (
              <line x1="0" y1="-4.2" x2="0" y2="4.2" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
            )}
          </>
        )}
      </g>
    );
  };

  const renderAuxOnFace = (faceName: string, faceData: any) => {
    if (!Array.isArray(faceData?.auxiliares) || faceData.auxiliares.length === 0) return null;

    const pos = facePositions[faceName];
    if (!pos) return null;

    return faceData.auxiliares.map((aux: any, index: number) => {
      const tool = CLINICAL_TOOLS.find(t => t.id === aux.id);
      if (!tool) return null;

      const strokeColor = getStateStroke(aux.state) || tool.color;
      const fillColor = getStateFill(aux.state, tool);
      const offsetX = faceName === 'mesial' || faceName === 'distal' ? 0 : (index - (faceData.auxiliares.length - 1) / 2) * 8;
      const offsetY = faceName === 'vestibular' || faceName === 'lingual' ? 0 : (index - (faceData.auxiliares.length - 1) / 2) * 8;

      return (
        <g key={`aux-${faceName}-${aux.id}-${index}`} transform={`translate(${pos.x + offsetX}, ${pos.y + offsetY})`} pointerEvents="none">
          {aux.id === 'modulo' && (
            <>
              <circle cx="0" cy="0" r="5.8" fill={fillColor} stroke={strokeColor} strokeWidth="2" opacity="1" />
              <circle cx="0" cy="0" r="2" fill="#FFFFFF" opacity="0.8" />
            </>
          )}
          {aux.id === 'ligadura_metalica' && (
            <>
              <line x1="-4.4" y1="-4.4" x2="4.4" y2="4.4" stroke={strokeColor} strokeWidth="2.1" strokeLinecap="round" />
              <line x1="4.4" y1="-4.4" x2="-4.4" y2="4.4" stroke={strokeColor} strokeWidth="2.1" strokeLinecap="round" />
            </>
          )}
          {aux.id === 'boton' && (
            <>
              <circle cx="0" cy="0" r="6" fill={fillColor} stroke={strokeColor} strokeWidth="2.2" />
              <circle cx="0" cy="0" r="2" fill="#FFFFFF" opacity="0.85" />
            </>
          )}
          {aux.id === 'bite_turbo' && (
            <path d="M -5.5 4 L 0 -5.5 L 5.5 4 Z" fill={fillColor} stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
          )}
          {!['modulo', 'ligadura_metalica', 'boton', 'bite_turbo'].includes(aux.id) && (
            <circle cx="0" cy="0" r="5.4" fill={fillColor} stroke={strokeColor} strokeWidth="2" opacity="1" />
          )}
        </g>
      );
    });
  };

  // Color del borde principal
  const mainStrokeColor = hasFalla ? COLORS.error : (hasRecementadoEjecutado ? '#374151' : (isSelected ? COLORS.primary : COLORS.borderDark));
  const mainStrokeWidth = hasFalla ? "3" : (hasRecementadoEjecutado ? "2.5" : (isSelected ? "2.5" : "1.5"));

  return (
    <div 
      className={`ortho-tooth${isSelected ? ' ortho-tooth-selected' : ''}`}
      style={{ 
        width: '56px', 
        height: '86px', 
        margin: '3px', 
        position: 'relative', 
        opacity: 1,
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
          <filter id={`glow-${number}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`glowAlert-${number}`}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`rxGlow-${number}`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#38bdf8" floodOpacity="0.55" />
            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#0ea5e9" floodOpacity="0.25" />
          </filter>
        </defs>
        
        {/* Glow alert pulsante para fallas de aparatologia */}
        {hasFalla && (
          <circle cx="50" cy="50" r="44" fill="none" stroke={COLORS.error} strokeWidth="3" opacity="0.6" filter={`url(#glowAlert-${number})`}>
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="r" values="44;47;44" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
        {/* Brillo intenso para recementado ejecutado en esta sesión */}
        {hasRecementadoEjecutado && !hasFalla && (
          <circle cx="50" cy="50" r="46" fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.95" filter={`url(#glow-${number})`}>
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="r" values="44;48;44" dur="1.2s" repeatCount="indefinite" />
          </circle>
        )}

        {hasRxRequest && (
          <g opacity="0.9">
            <rect x="12" y="12" width="76" height="76" rx="26" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" filter={`url(#rxGlow-${number})`}>
              <animate attributeName="opacity" values="0.45;0.9;0.45" dur="1.8s" repeatCount="indefinite" />
            </rect>
          </g>
        )}
        
        <circle cx="50" cy="50" r="42" fill={isSelected ? COLORS.secondaryLight : '#FFFFFF'} stroke={mainStrokeColor} strokeWidth={mainStrokeWidth} filter={`url(#shadow-${number})`} />
        
        {/* 5 CARAS CLICKEABLES */}
        <g stroke={COLORS.borderDark} strokeWidth="1" fill="none">
          {/* Cara Vestibular (arriba) */}
          <path 
            d="M 15 15 Q 50 5 85 15 L 65 35 Q 50 30 35 35 Z" 
            fill={faces.vestibular?.color || '#FAFAFA'} 
            onClick={() => onFaceClick?.(number, 'vestibular')}
            style={{ 
              cursor: 'pointer',
              transition: 'fill 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '1';
            }}
          />
          
          {/* Cara Lingual (abajo) */}
          <path 
            d="M 35 65 Q 50 70 65 65 L 85 85 Q 50 95 15 85 Z" 
            fill={faces.lingual?.color || '#FAFAFA'} 
            onClick={() => onFaceClick?.(number, 'lingual')}
            style={{ 
              cursor: 'pointer',
              transition: 'fill 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '1';
            }}
          />
          
          {/* Cara Mesial (izquierda) */}
          <path 
            d="M 15 15 L 35 35 Q 30 50 35 65 L 15 85 Q 5 50 15 15 Z" 
            fill={faces.mesial?.color || '#FAFAFA'} 
            onClick={() => onFaceClick?.(number, 'mesial')}
            style={{ 
              cursor: 'pointer',
              transition: 'fill 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '1';
            }}
          />
          
          {/* Cara Distal (derecha) */}
          <path 
            d="M 85 15 L 65 35 Q 70 50 65 65 L 85 85 Q 95 50 85 15 Z" 
            fill={faces.distal?.color || '#FAFAFA'} 
            onClick={() => onFaceClick?.(number, 'distal')}
            style={{ 
              cursor: 'pointer',
              transition: 'fill 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '1';
            }}
          />
          
          {/* Cara Oclusal (centro) */}
          <circle 
            cx="50" cy="50" r="15" 
            fill={faces.oclusal?.color || '#F3F4F6'} 
            stroke={COLORS.borderDark} 
            strokeWidth="0.8"
            onClick={() => onFaceClick?.(number, 'oclusal')}
            style={{ 
              cursor: 'pointer',
              transition: 'fill 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as any;
              target.style.opacity = '1';
            }}
          />
        </g>

        {/* Arco con animación fluida - alineado con la ranura del bracket */}
        {isWireActive && !data?.ausente && (
          <>
            <line x1="-20" y1={connectionY} x2="120" y2={connectionY} stroke={COLORS.arco} strokeWidth="4" strokeOpacity="0.15" pointerEvents="none" />
            <line 
              x1="-20" y1={connectionY} x2="120" y2={connectionY} 
              stroke={COLORS.arco} strokeWidth="3.5" strokeOpacity="0.7"
              pointerEvents="none"
              style={{
                strokeDasharray: '24',
                animation: 'scanningPulse 2s ease-in-out infinite',
              }}
            >
              <animate attributeName="strokeOpacity" values="0.5;0.85;0.5" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="strokeWidth" values="3.5;4.5;3.5" dur="2.5s" repeatCount="indefinite" />
            </line>
            <circle cx="50" cy="50" r="48" fill="none" stroke={COLORS.arco} strokeWidth="0.5" opacity="0.1" pointerEvents="none">
              <animate attributeName="r" values="48;52;48" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.15;0" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}
        
        {/* Cadeneta con animación de flujo suave y brillo */}
        {isChainActive && !data?.ausente && (
          <>
            <line x1="-20" y1={connectionY} x2="120" y2={connectionY} stroke={COLORS.cadeneta} strokeWidth="5.5" strokeOpacity="0.2" pointerEvents="none" />
            <line 
              x1="-20" y1={connectionY} x2="120" y2={connectionY} 
              stroke={COLORS.cadeneta} strokeWidth="5" strokeOpacity="0.7" 
              strokeDasharray="8 4"
              pointerEvents="none"
              style={{
                animation: 'scanningPulse 1.5s ease-in-out infinite',
              }}
            >
              <animate attributeName="strokeDashoffset" values="0;-12" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="strokeOpacity" values="0.5;0.85;0.5" dur="1.8s" repeatCount="indefinite" />
            </line>
          </>
        )}
        
        {/* Resorte con animación de ondulación y cambio de color */}
        {isSpringActive && !data?.ausente && (
          <>
            <path 
              d={`M -20 ${connectionY} Q -8 ${connectionY - 8} 4 ${connectionY} T 28 ${connectionY} T 52 ${connectionY} T 76 ${connectionY} T 100 ${connectionY} T 120 ${connectionY}`}
              fill="none" stroke={COLORS.resorte} strokeWidth="2" opacity="0.2" pointerEvents="none"
            />
            <path 
              d={`M -20 ${connectionY} Q -8 ${connectionY - 8} 4 ${connectionY} T 28 ${connectionY} T 52 ${connectionY} T 76 ${connectionY} T 100 ${connectionY} T 120 ${connectionY}`}
              fill="none" stroke={COLORS.resorte} strokeWidth="2.5"
              pointerEvents="none"
              style={{
                animation: 'subtleFloat 1.6s ease-in-out infinite',
              }}
            >
              <animate attributeName="strokeOpacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="strokeWidth" values="2.5;3.5;2.5" dur="1.8s" repeatCount="indefinite" />
            </path>
          </>
        )}

        {/* Indicadores visuales de bases en caras (pequeños iconos) */}
        {!data?.ausente && hasBaseOnAnyFace && <g>{Object.entries(faces).map(([faceName, faceData]) => renderBaseOnFace(faceName, faceData))}</g>}

        {!data?.ausente && hasAuxOnAnyFace && <g>{Object.entries(faces).flatMap(([faceName, faceData]) => renderAuxOnFace(faceName, faceData) || [])}</g>}

        {/* Indicador de estado en caras específicas: X para fallas, check para recementado ejecutado */}
        {!data?.ausente && (
          <g>
            {Object.entries(faces).map(([faceName, faceData]: [string, any]) => {
              const state = faceData?.base?.state;
              if (state === 'recementado') {
                const positions: Record<string, { x: number, y: number }> = {
                  vestibular: { x: 50, y: 23 },
                  lingual: { x: 50, y: 77 },
                  mesial: { x: 23, y: 50 },
                  distal: { x: 77, y: 50 },
                  oclusal: { x: 50, y: 50 }
                };
                const pos = positions[faceName];
                const color = COLORS.error;
                return (
                  <g key={faceName} transform={`translate(${pos.x}, ${pos.y})`}>
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="5" y1="-5" x2="-5" y2="5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                );
              }
              return null;
            })}
          </g>
        )}

        {/* Diente ausente */}
        {data?.ausente && (
          <g transform="translate(50, 50)">
            <circle cx="0" cy="0" r="34" fill="#ffffff" opacity="0.82" />
            <line x1="-28" y1="-28" x2="28" y2="28" stroke={COLORS.error} strokeWidth="6" strokeLinecap="round" opacity="0.95" />
            <line x1="28" y1="-28" x2="-28" y2="28" stroke={COLORS.error} strokeWidth="6" strokeLinecap="round" opacity="0.95" />
          </g>
        )}

        {/* Contenedor para el número */}
        <g>
          <rect x="32" y="108" width="36" height="22" rx="6" fill={isSelected ? COLORS.primary : COLORS.secondaryLight} stroke={isSelected ? COLORS.primaryDark : COLORS.borderDark} strokeWidth="1.5" filter={`url(#shadow-${number})`} />
          <text x="50" y="123" textAnchor="middle" fontSize="14" fontWeight="800" fill={isSelected ? '#FFFFFF' : COLORS.textLight}>
            {number}
          </text>
        </g>

        {/* Indicadores Diagnósticos (Módulo Diamond) - ANIMACIONES MEJORADAS */}
        {data?.diagnosticos && !data?.ausente && (
          <g>
            {/* Dolor - Pulsante rojo con brillo */}
            {data.diagnosticos.dolor && (
              <g style={{ animation: 'breathingPulse 1.2s ease-in-out infinite' }}>
                <circle cx="20" cy="8" r="8" fill="#DC2626" opacity="0.95" filter={`url(#glowAlert-${number})`}>
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="20" cy="8" r="8" fill="none" stroke="#DC2626" strokeWidth="1.5" opacity="0.3">
                  <animate attributeName="r" values="8;14;8" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <text x="20" y="12" textAnchor="middle" fontSize="10" fill="white" fontWeight="900" letterSpacing="0.5">D</text>
              </g>
            )}
            
            {/* Movilidad - Ondulante púrpura con movimiento */}
            {data.diagnosticos.movil && (
              <g style={{ animation: 'rightLeftShake 1.3s ease-in-out infinite' }}>
                <circle cx="50" cy="8" r="8" fill="#7C3AED" opacity="0.9" filter={`url(#glow-${number})`}>
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="1.3s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="8" r="8" fill="none" stroke="#7C3AED" strokeWidth="1" opacity="0.2">
                  <animate attributeName="r" values="8;12;8" dur="1.3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.3s" repeatCount="indefinite" />
                </circle>
                <text x="50" y="13" textAnchor="middle" fontSize="9" fill="white" fontWeight="900" letterSpacing="0.5">↔</text>
              </g>
            )}
            
            {/* RX requerida - Brillo azul celeste con onda */}
            {data.diagnosticos.rx_req && (
              <g style={{ animation: 'glowWave 1.4s ease-in-out infinite' }}>
                <rect x="68" y="0" width="24" height="16" rx="8" fill="#0284C7" opacity="0.95" filter={`url(#rxGlow-${number})`}>
                  <animate attributeName="opacity" values="0.65;1;0.65" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="rx" values="8;10;8" dur="1.4s" repeatCount="indefinite" />
                </rect>
                <rect x="68" y="0" width="24" height="16" rx="8" fill="none" stroke="#0284C7" strokeWidth="1.5" opacity="0.2">
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="1.4s" repeatCount="indefinite" />
                </rect>
                <text x="80" y="11" textAnchor="middle" fontSize="8" fill="white" fontWeight="900" letterSpacing="0.6">RX</text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
});

// Helper para migrar formato antiguo a nuevo
const migrateLegacyTooth = (tooth: any): OrthoTooth => {
  // Si ya tiene faces, resetear estados de sesión y retornar
  if (tooth.faces) {
    // 'recementado_ejecutado' es solo visual de sesión: en nueva sesión vuelve a 'instalado'
    const cleaned = cloneTooth(tooth as OrthoTooth);
    Object.values(cleaned.faces).forEach((face: any) => {
      if (face.base?.state === 'recementado_ejecutado') {
        const baseId = face.base?.id;
        face.base.state = 'instalado';
        const toolData = CLINICAL_TOOLS.find(t => t.id === baseId);
        face.color = toolData?.colorLight || '#E0F2FE';
      }
      if (face.base?.state === 'fracturado') {
        face.base.state = 'recementado';
      }
      if (Array.isArray(face.auxiliares)) {
        face.auxiliares = face.auxiliares.map((aux: any) => {
          if (aux?.state === 'fracturado') return { ...aux, state: 'recementado' };
          return aux;
        });
      }
    });
    if (cleaned.base?.state === 'fracturado') cleaned.base.state = 'recementado';
    if (Array.isArray(cleaned.auxiliares)) {
      cleaned.auxiliares = cleaned.auxiliares.map((aux) => {
        if (aux?.state === 'fracturado') return { ...aux, state: 'recementado' };
        return aux;
      });
    }
    return cleaned;
  }
  
  // Migrar del formato antiguo
  const newTooth = createEmptyTooth(tooth.number);
  newTooth.ausente = tooth.ausente || false;
  
  // Si tenía base, colocarla en vestibular (cara más común para brackets)
  if (tooth.base) {
    newTooth.faces.vestibular.base = tooth.base;
    const toolData = CLINICAL_TOOLS.find(t => t.id === tooth.base.id);
    newTooth.faces.vestibular.color = toolData?.colorLight || '#E0F2FE';
  }
  
  // Si tenía auxiliares, distribuirlos
  if (tooth.auxiliares && tooth.auxiliares.length > 0) {
    // Primer auxiliar en oclusal, resto en otras caras
    tooth.auxiliares.forEach((aux: any, idx: number) => {
      const faceKeys = ['oclusal', 'mesial', 'distal', 'lingual'] as const;
      const targetFace = faceKeys[idx] || 'oclusal';
      if (!newTooth.faces[targetFace].auxiliares) {
        newTooth.faces[targetFace].auxiliares = [];
      }
      newTooth.faces[targetFace].auxiliares!.push(aux);
    });
  }
  
  return newTooth;
};

// ============================================
// 3. COMPONENTE PRINCIPAL
// ============================================

export const OrthoOdontogram = ({ onUpdate, value, syncVersion, onNavigateToFailures, lastUpdateLabel, patientId, onAlambreAdjustment, onLigatureChange }: any) => {
  // La clave de localStorage es por paciente para evitar contaminación entre pacientes
  const storageKey = `ortho_odontogram_${patientId || 'temp'}`;

  const [activeState, setActiveState] = useState(STATES[0].id);
  const [activeTool, setActiveTool] = useState(CLINICAL_TOOLS[0].id);
  const [activeFace, setActiveFace] = useState<'oclusal' | 'vestibular' | 'lingual' | 'mesial' | 'distal'>('vestibular');
  const [activeToolHover, setActiveToolHover] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Inicializar desde localStorage específico del paciente
  const [teethData, setTeethData] = useState<Record<string, OrthoTooth>>(() => {
    const key = `ortho_odontogram_${patientId || 'temp'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const rawData = parsed.teethData || {};
        const migratedData: Record<string, OrthoTooth> = {};
        Object.entries(rawData).forEach(([k, tooth]) => {
          migratedData[k] = migrateLegacyTooth(tooth);
        });
        return migratedData;
      } catch (e) {
        return {};
      }
    }
    return {};
  });
  
  const [connections, setConnections] = useState<Connection[]>(() => {
    const key = `ortho_odontogram_${patientId || 'temp'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.connections || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeDetalleId, setActiveDetalleId] = useState<string | null>(null);
  const [detalleWindowPos, setDetalleWindowPos] = useState({ x: 140, y: 120 });
  
  const [history, setHistory] = useState<HistoryState[]>([{ teethData: {}, connections: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Tracking de retiros en esta sesión para documentar en resumen clínico
  const [retirosEnSesion, setRetirosEnSesion] = useState<Array<{
    id: string;
    diente: string;
    cara: string;
    tipo: string;
    timestamp: number;
  }>>([]);
  
  const isInternalUpdate = useRef(false);
  const detalleWindowRef = useRef<HTMLDivElement | null>(null);
  const detalleAnchorRef = useRef<HTMLElement | null>(null);
  // Indica si el cambio fue hecho por el usuario (no por carga inicial)
  const hasUserMadeChange = useRef(false);
  // Impide aplicar el value de Supabase más de una vez (evita bucles)
  const hasAppliedInitialValue = useRef(false);
  // Indica si el componente ya terminó la inicialización (para la notificación inicial)
  const isInitialized = useRef(false);
  // Rastrea la última syncVersion aplicada para evitar re-aplicar
  const lastSyncVersionRef = useRef<number>(0);

  // Función auxiliar que construye el array de hallazgos a partir del estado actual
  const buildHallazgos = useCallback((teeth: Record<string, OrthoTooth>, conns: Connection[]) => {
    const hallazgos: any[] = [];
    Object.values(teeth).forEach(diente => {
      Object.entries(diente.faces).forEach(([faceName, faceData]) => {
        // Reportar bases con estado de falla pendiente
        // recementado = bracket despegado que necesita recementado
        // recementado_ejecutado = ya fue recementado en esta sesión (NO generar hallazgo nuevo)
        if (faceData.base && faceData.base.state === 'recementado') {
          const tData = CLINICAL_TOOLS.find(t => t.id === faceData.base?.id);
          hallazgos.push({ 
            id: `falla-${diente.number}-${faceName}`, 
            diente: diente.number, 
            cara: faceName,
            tipo: tData?.name || 'Bracket', 
            severidad: 'recementado', 
            descripcion: `Pieza ${diente.number} llegó con ${tData?.name || 'bracket'} despegado - Se procederá a recementar`
          });
        }

        // Recementado ya ejecutado en esta sesión (documentación, sin generar nuevo cobro)
        if (faceData.base && faceData.base.state === 'recementado_ejecutado') {
          const tData = CLINICAL_TOOLS.find(t => t.id === faceData.base?.id);
          hallazgos.push({
            id: `recementado-ok-${diente.number}-${faceName}`,
            diente: diente.number,
            cara: faceName,
            tipo: tData?.name || 'Bracket',
            severidad: 'recementado_ejecutado',
            descripcion: `Pieza ${diente.number}: ${tData?.name || 'bracket'} se recementó en esta sesión (${faceName})`
          });
        }
        
        // Auxiliares con fallas
        if (Array.isArray(faceData.auxiliares)) {
          faceData.auxiliares.forEach((aux: any) => {
            if (aux?.state === 'recementado') {
              const tData = CLINICAL_TOOLS.find(t => t.id === aux.id);
              hallazgos.push({
                id: `falla-aux-${diente.number}-${faceName}-${aux.id}`,
                diente: diente.number,
                cara: faceName,
                tipo: tData?.name || 'Auxiliar',
                severidad: 'recementado',
                descripcion: `Pieza ${diente.number} llegó con ${tData?.name || 'auxiliar'} despegado`
              });
            }
          });
        }
      });
      
      // Agregar hallazgos de RETIROS realizados en esta sesión
      retirosEnSesion.filter(r => r.diente === diente.number).forEach(retiro => {
        hallazgos.push({
          id: retiro.id,
          diente: retiro.diente,
          cara: retiro.cara,
          tipo: retiro.tipo,
          severidad: 'retirado',
          descripcion: `Retiro clínico: ${retiro.tipo} removido de pieza ${retiro.diente} (${retiro.cara})`
        });
      });
      // Hallazgos diagnósticos (Módulo Diamond)
      if (diente.diagnosticos) {
        if (diente.diagnosticos.dolor) {
          hallazgos.push({
            id: `dx-dolor-${diente.number}`,
            diente: diente.number,
            tipo: 'Dolor Sintomático',
            severidad: 'diagnostico',
            descripcion: `Pieza ${diente.number} con sintomatología dolorosa`
          });
        }
        if (diente.diagnosticos.movil) {
          hallazgos.push({
            id: `dx-movil-${diente.number}`,
            diente: diente.number,
            tipo: 'Movilidad Dental',
            severidad: 'diagnostico',
            descripcion: `Pieza ${diente.number} con movilidad dental registrada`
          });
        }
        if (diente.diagnosticos.rx_req) {
          hallazgos.push({
            id: `dx-rx-${diente.number}`,
            diente: diente.number,
            tipo: 'Requiere Radiografía',
            severidad: 'diagnostico',
            descripcion: `Pieza ${diente.number} marcada para estudio radiográfico`
          });
        }
      }
    });
    conns.forEach(conn => {
      const tData = CLINICAL_TOOLS.find(t => t.id === conn.toolId);
      hallazgos.push({ 
        id: conn.id, 
        diente: `${conn.teeth?.[0]} - ${conn.teeth?.[conn.teeth?.length-1]}`, 
        tipo: tData?.name, 
        severidad: conn.state, 
        descripcion: `Sistema activo en ${conn.teeth?.length || 0} piezas` 
      });
    });
    return hallazgos;
  }, [retirosEnSesion]);

  // EFECTO ÚNICO DE NOTIFICACIÓN: se dispara en cada cambio de teethData/connections
  // Incluye la primera carga (localStorage o value) y todos los cambios del usuario
  useEffect(() => {
    if (!onUpdate) return;
    if (!isInitialized.current) return; // No notificar hasta inicialización completa
    
    const hallazgos = buildHallazgos(teethData, connections);
    onUpdate(hallazgos, { 
      teethData, 
      connections,
      isUserChange: hasUserMadeChange.current 
    });
  }, [teethData, connections, onUpdate, buildHallazgos]);

  // INICIALIZACIÓN: marcar como inicializado después del primer render
  // y notificar al padre con los datos cargados de localStorage
  useEffect(() => {
    isInitialized.current = true;
    if (!onUpdate) return;
    // Notificar con los datos iniciales (pueden venir de localStorage o ser vacíos)
    const hallazgos = buildHallazgos(teethData, connections);
    onUpdate(hallazgos, { 
      teethData, 
      connections,
      isUserChange: false // Carga inicial, no es modificación del usuario
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo en mount

  // Persistencia en localStorage (por paciente)
  useEffect(() => {
    const dataToSave = { teethData, connections };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [teethData, connections, storageKey]);

  // APLICAR VALUE DESDE PADRE (Supabase): solo si localStorage está vacío para este paciente
  // Esto permite que los datos de Supabase se apliquen cuando no hay sesión local guardada
  useEffect(() => {
    if (hasAppliedInitialValue.current) return; // Solo aplicar una vez
    if (!value || typeof value !== 'object') return;
    
    const incomingTeethData = value.teethData || {};
    const incomingConnections = value.connections || [];
    
    // Si no hay datos entrantes del padre, no hacer nada
    if (Object.keys(incomingTeethData).length === 0 && incomingConnections.length === 0) return;
    
    // Si el localStorage ya tiene datos para este paciente, el localStorage tiene prioridad
    // (el usuario estaba en una sesión no guardada y regresó)
    if (Object.keys(teethData).length > 0 || connections.length > 0) {
      hasAppliedInitialValue.current = true; // Marcar como manejado sin cambios
      return;
    }
    
    // localStorage vacío: aplicar los datos del padre (Supabase)
    hasAppliedInitialValue.current = true;
    const migratedData: Record<string, OrthoTooth> = {};
    Object.entries(incomingTeethData).forEach(([k, tooth]) => {
      migratedData[k] = migrateLegacyTooth(tooth);
    });
    
    setTeethData(migratedData);
    setConnections(incomingConnections);
    setHistory([{ teethData: migratedData, connections: incomingConnections }]);
    setHistoryIndex(0);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // SINCRONIZACIÓN EXPLÍCITA CON PADRE:
  // Solo se aplica cuando el padre incrementa syncVersion (ej. tras ejecutar un tratamiento).
  // NO llama migrateLegacyTooth para preservar estados de sesión como 'recementado_ejecutado'.
  useEffect(() => {
    if (!syncVersion || syncVersion <= lastSyncVersionRef.current) return;
    if (!value || typeof value !== 'object') return;

    lastSyncVersionRef.current = syncVersion;

    const incomingTeethData = value.teethData || {};
    const incomingConnections = value.connections || [];

    // Aplicar directamente sin migrar: el padre siempre envía formato moderno
    const directData: Record<string, OrthoTooth> = {};
    Object.entries(incomingTeethData).forEach(([k, tooth]: [string, any]) => {
      // Preservar recementado_ejecutado (visual de sesión) sin resetear a instalado
      directData[k] = tooth as OrthoTooth;
    });

    setTeethData(directData);
    setConnections(incomingConnections);
    localStorage.setItem(storageKey, JSON.stringify({ teethData: directData, connections: incomingConnections }));
  }, [syncVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetalleNearButton = useCallback((id: string, anchorEl: HTMLElement) => {
    const rect = anchorEl.getBoundingClientRect();
    const panelWidth = Math.min(420, Math.floor(window.innerWidth * 0.92));
    const gap = 10;
    let x = rect.left;
    const y = rect.bottom + gap;

    // Ajuste horizontal mínimo para no cortar en bordes
    x = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, x));

    detalleAnchorRef.current = anchorEl;
    setDetalleWindowPos({ x, y });
    setActiveDetalleId(id);
  }, []);

  useEffect(() => {
    if (!activeDetalleId) return;

    const close = () => setActiveDetalleId(null);

    const handleOutsideDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inPanel = !!detalleWindowRef.current?.contains(target);
      const inAnchor = !!detalleAnchorRef.current?.contains(target);
      if (!inPanel && !inAnchor) close();
    };

    const handleTouch = (event: TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inPanel = !!detalleWindowRef.current?.contains(target);
      const inAnchor = !!detalleAnchorRef.current?.contains(target);
      if (!inPanel && !inAnchor) close();
    };

    const handleWheel = () => close();
    const handleScroll = () => close();

    window.addEventListener('mousedown', handleOutsideDown);
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideDown);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDetalleId]);

  const upperTeeth = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  const lowerTeeth = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];

  const getTooth = useCallback((num: string): OrthoTooth => {
    return teethData[num] || CACHED_EMPTY_TEETH[num] || createEmptyTooth(num);
  }, [teethData]);

  const saveHistory = (newTeeth: Record<string, OrthoTooth>, newConnections: Connection[]) => {
    const MAX_HISTORY = 80;
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({ teethData: newTeeth, connections: newConnections });
    const boundedHistory = nextHistory.length > MAX_HISTORY ? nextHistory.slice(nextHistory.length - MAX_HISTORY) : nextHistory;
    setHistory(boundedHistory);
    setHistoryIndex(boundedHistory.length - 1);
  };

  const handleFaceClick = (toothNum: string, face: string) => {
    setSelectedTooth(toothNum);
    setActiveFace(face as any);
    applyToolToFace(toothNum, face as any);
  };
  
  const applyToolToFace = useCallback((toothNum: string, clickedFace: 'oclusal' | 'vestibular' | 'lingual' | 'mesial' | 'distal') => {
    const tool = CLINICAL_TOOLS.find(t => t.id === activeTool);
    if (!tool) return;

    isInternalUpdate.current = true;

    const nextTeeth = { ...teethData };
    let nextConns = [...connections];
    const current = cloneTooth(nextTeeth[toothNum], toothNum);
    nextTeeth[toothNum] = current;

    const now = Date.now();
    const retirosBatch: Array<{ id: string; diente: string; cara: string; tipo: string; timestamp: number }> = [];

    let targetFace = clickedFace;
    if (tool.type === 'auxiliar' && activeState === 'instalado') {
      const faceWithBase = Object.entries(current.faces).find(([_, faceData]: [string, any]) =>
        faceData.base && (faceData.base.state === 'instalado' || faceData.base.state === 'recementado_ejecutado')
      );
      if (faceWithBase) targetFace = faceWithBase[0] as typeof targetFace;
    }

    if (activeState === 'retirado') {
      const orderedFaces = [clickedFace, 'distal', 'mesial', 'vestibular', 'lingual', 'oclusal']
        .filter((face, idx, arr) => arr.indexOf(face) === idx) as Array<'oclusal' | 'vestibular' | 'lingual' | 'mesial' | 'distal'>;

      const registerRetiro = (cara: string, tipo: string) => {
        retirosBatch.push({
          id: `retiro-${toothNum}-${cara}-${now}-${Math.random().toString(36).slice(2, 6)}`,
          diente: toothNum,
          cara,
          tipo,
          timestamp: now,
        });
      };

      let removed = false;

      // 1) Prioridad por herramienta seleccionada
      if (!removed && tool.type === 'base') {
        for (const faceName of orderedFaces) {
          const base = current.faces[faceName]?.base;
          if (base?.id === tool.id) {
            const toolData = CLINICAL_TOOLS.find((t) => t.id === base.id);
            current.faces[faceName].base = null;
            current.faces[faceName].color = '#FAFAFA';
            registerRetiro(faceName, toolData?.name || tool.name);
            setSuccessMessage(`🗑 ${toolData?.name || tool.name} retirado de pieza ${toothNum} (${faceName})`);
            removed = true;
            break;
          }
        }
      }

      if (!removed && tool.type === 'auxiliar') {
        for (const faceName of orderedFaces) {
          const auxList = Array.isArray(current.faces[faceName]?.auxiliares) ? current.faces[faceName].auxiliares : [];
          const idx = auxList.findIndex((aux: any) => aux.id === tool.id);
          if (idx !== -1) {
            current.faces[faceName].auxiliares = auxList.filter((_: any, i: number) => i !== idx);
            registerRetiro(faceName, tool.name);
            setSuccessMessage(`🗑 ${tool.name} retirado de pieza ${toothNum} (${faceName})`);
            removed = true;
            break;
          }
        }
      }

      if (!removed && tool.type === 'conexion') {
        const connIndex = nextConns.findIndex((conn) => conn.toolId === tool.id && conn.teeth.includes(toothNum));
        if (connIndex !== -1) {
          const conn = nextConns[connIndex];
          const remaining = conn.teeth.filter((t) => t !== toothNum);
          if (remaining.length === 0) nextConns.splice(connIndex, 1);
          else nextConns[connIndex] = { ...conn, teeth: remaining };
          registerRetiro('Sistema', tool.name);
          setSuccessMessage(`🗑 ${tool.name} retirado de pieza ${toothNum}`);
          removed = true;
        }
      }

      if (!removed && tool.type === 'diagnostico') {
        if (!current.diagnosticos) current.diagnosticos = {};
        const toolKey = tool.id as 'dolor' | 'movil' | 'rx_req';
        if (current.diagnosticos[toolKey]) {
          current.diagnosticos[toolKey] = false;
          registerRetiro('Diagnóstico', tool.name);
          setSuccessMessage(`🗑 ${tool.name} retirado en pieza ${toothNum}`);
          removed = true;
        }
      }

      // 2) Fallback inteligente: quitar 1 elemento por clic hasta vaciar
      if (!removed) {
        for (const faceName of orderedFaces) {
          const face = current.faces[faceName];
          const auxList = Array.isArray(face?.auxiliares) ? face.auxiliares : [];
          if (auxList.length > 0) {
            const removedAux = auxList[auxList.length - 1];
            const auxTool = CLINICAL_TOOLS.find((t) => t.id === removedAux?.id);
            face.auxiliares = auxList.slice(0, -1);
            registerRetiro(faceName, auxTool?.name || 'Auxiliar');
            setSuccessMessage(`🗑 ${auxTool?.name || 'Auxiliar'} retirado de pieza ${toothNum} (${faceName})`);
            removed = true;
            break;
          }
        }
      }

      if (!removed) {
        for (const faceName of orderedFaces) {
          const base = current.faces[faceName]?.base;
          if (base) {
            const baseTool = CLINICAL_TOOLS.find((t) => t.id === base.id);
            current.faces[faceName].base = null;
            current.faces[faceName].color = '#FAFAFA';
            registerRetiro(faceName, baseTool?.name || 'Aparato');
            setSuccessMessage(`🗑 ${baseTool?.name || 'Aparato'} retirado de pieza ${toothNum} (${faceName})`);
            removed = true;
            break;
          }
        }
      }

      if (!removed) {
        const connIndex = nextConns.findIndex((conn) => conn.teeth.includes(toothNum));
        if (connIndex !== -1) {
          const conn = nextConns[connIndex];
          const connTool = CLINICAL_TOOLS.find((t) => t.id === conn.toolId);
          const remaining = conn.teeth.filter((t) => t !== toothNum);
          if (remaining.length === 0) nextConns.splice(connIndex, 1);
          else nextConns[connIndex] = { ...conn, teeth: remaining };
          registerRetiro('Sistema', connTool?.name || 'Sistema');
          setSuccessMessage(`🗑 ${connTool?.name || 'Sistema'} retirado de pieza ${toothNum}`);
          removed = true;
        }
      }

      if (!removed && current.diagnosticos) {
        const diagnosticOrder: Array<'dolor' | 'movil' | 'rx_req'> = ['dolor', 'movil', 'rx_req'];
        const foundKey = diagnosticOrder.find((key) => Boolean(current.diagnosticos?.[key]));
        if (foundKey) {
          const dxTool = CLINICAL_TOOLS.find((t) => t.id === foundKey);
          current.diagnosticos[foundKey] = false;
          registerRetiro('Diagnóstico', dxTool?.name || 'Diagnóstico');
          setSuccessMessage(`🗑 ${dxTool?.name || 'Diagnóstico'} retirado en pieza ${toothNum}`);
          removed = true;
        }
      }

      if (!removed && current.ausente) {
        current.ausente = false;
        registerRetiro('Dental', 'Extraído/Ausente');
        setSuccessMessage(`↩ Pieza ${toothNum} restaurada como presente`);
        removed = true;
      }

      if (!removed) {
        setSuccessMessage(`ℹ Pieza ${toothNum} sin elementos para retirar`);
      }

      if (retirosBatch.length > 0) setRetirosEnSesion((prev) => [...prev, ...retirosBatch]);
    } else if (tool.type === 'conexion') {
      if (activeState !== 'instalado') {
        setSuccessMessage('ℹ Recementado no aplica a conexiones globales');
      } else {
        const existingIndex = nextConns.findIndex((conn) => conn.toolId === tool.id && conn.teeth.includes(toothNum));
        if (existingIndex !== -1) {
          const conn = nextConns[existingIndex];
          const nextTeethList = conn.teeth.filter((t) => t !== toothNum);
          if (nextTeethList.length === 0) {
            nextConns.splice(existingIndex, 1);
          } else {
            nextConns[existingIndex] = { ...conn, teeth: nextTeethList };
          }
          setSuccessMessage(`↩ ${tool.name} quitado de pieza ${toothNum}`);
        } else {
          nextConns.push({
            id: `conn_${now}_${Math.random().toString(36).slice(2)}`,
            toolId: tool.id,
            teeth: [toothNum],
            state: 'instalado',
            timestamp: now,
          });
          setSuccessMessage(`✓ ${tool.name} instalado en pieza ${toothNum}`);
        }
      }
    } else if (tool.id === 'ausente') {
      if (activeState === 'instalado') {
        current.ausente = true;
        current.diagnosticos = {};
        Object.keys(current.faces).forEach((faceKey) => {
          current.faces[faceKey as keyof typeof current.faces] = createEmptyFace();
        });
        nextConns = nextConns
          .map((conn) => ({ ...conn, teeth: conn.teeth.filter((t) => t !== toothNum) }))
          .filter((conn) => conn.teeth.length > 0);
        setSuccessMessage(`✓ Pieza ${toothNum} marcada como extraída/ausente`);
      } else {
        setSuccessMessage('ℹ Extraído/Ausente solo se aplica en modo instalado');
      }
    } else if (tool.type === 'base') {
      if (activeState === 'instalado') {
        const face = current.faces[targetFace];
        face.base = { id: tool.id, state: 'instalado' };
        face.color = tool.colorLight || '#E0F2FE';
        setSuccessMessage(`✓ ${tool.name} instalado en pieza ${toothNum} (${targetFace})`);
      } else if (activeState === 'recementado') {
        const faceWithBase = Object.entries(current.faces).find(([_, faceData]: [string, any]) =>
          faceData.base && (faceData.base.state === 'instalado' || faceData.base.state === 'recementado_ejecutado')
        );
        if (faceWithBase) {
          const [faceName] = faceWithBase;
          const face = current.faces[faceName as keyof typeof current.faces];
          if (face.base?.state === 'recementado_ejecutado') {
            setSuccessMessage(`ℹ Pieza ${toothNum} ya fue recementada en esta sesión`);
          } else if (face.base) {
            const baseToolData = CLINICAL_TOOLS.find((t) => t.id === face.base?.id);
            face.base.state = 'recementado';
            face.color = '#FEE2E2';
            setSuccessMessage(`⚠ ${baseToolData?.name || 'Bracket'} en pieza ${toothNum} marcado para recementado`);
          }
        } else {
          setSuccessMessage(`❌ No hay aparato instalado en pieza ${toothNum} para marcar recementado`);
        }
      }
    } else if (tool.type === 'auxiliar') {
      if (activeState === 'instalado') {
        const actuales = current.faces[targetFace].auxiliares || [];
        const sinDuplicado = actuales.filter((aux: any) => aux.id !== tool.id);
        current.faces[targetFace].auxiliares = [...sinDuplicado, { id: tool.id, state: 'instalado' }];
        setSuccessMessage(`✓ ${tool.name} instalado en pieza ${toothNum} (${targetFace})`);
      } else if (activeState === 'recementado') {
        let found = false;
        Object.entries(current.faces).forEach(([faceName, faceData]: [string, any]) => {
          if (!found && Array.isArray(faceData.auxiliares)) {
            const auxIndex = faceData.auxiliares.findIndex((aux: any) => aux.id === tool.id && aux.state === 'instalado');
            if (auxIndex !== -1) {
              current.faces[faceName as keyof typeof current.faces].auxiliares![auxIndex].state = 'recementado';
              found = true;
            }
          }
        });
        setSuccessMessage(found ? `⚠ ${tool.name} en pieza ${toothNum} marcado para recementado` : `❌ No hay ${tool.name} instalado en pieza ${toothNum}`);
      }
    } else if (tool.type === 'diagnostico') {
      if (!current.diagnosticos) current.diagnosticos = {};
      const toolKey = tool.id as 'dolor' | 'movil' | 'rx_req';
      if (activeState === 'instalado') {
        current.diagnosticos[toolKey] = !current.diagnosticos[toolKey];
      } else {
        setSuccessMessage('ℹ Recementado no aplica a marcadores diagnósticos');
      }
    }

    hasUserMadeChange.current = true;
    setTeethData(nextTeeth);
    setConnections(nextConns);
    saveHistory(nextTeeth, nextConns);

    setShowSuccessAnimation(true);
    setTimeout(() => setShowSuccessAnimation(false), 900);

    isInternalUpdate.current = false;
  }, [activeTool, activeState, teethData, connections]);

  // Notificar al padre (solo cambios posteriores al mount) — ELIMINADO: lógica unificada arriba

  const undo = () => {
    if (historyIndex === 0) return;
    const previous = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    setTeethData(previous.teethData);
    setConnections(previous.connections);
    setSelectedTooth(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    setTeethData(next.teethData);
    setConnections(next.connections);
    setSelectedTooth(null);
  };

  const executeClearAll = () => {
    hasUserMadeChange.current = true;
    setTeethData({});
    setConnections([]);
    setSelectedTooth(null);
    setHistory([{ teethData: {}, connections: [] }]);
    setHistoryIndex(0);
    localStorage.removeItem(storageKey);
  };

  const clearAll = () => setShowClearConfirm(true);

  const UPPER_NO_WISDOM = ['17','16','15','14','13','12','11','21','22','23','24','25','26','27'];
  const LOWER_NO_WISDOM = ['47','46','45','44','43','42','41','31','32','33','34','35','36','37'];
  const UPPER_MOLARS = ['18','17','28','27'];
  const LOWER_MOLARS = ['48','47','38','37'];
  const UPPER_ARC = ['17','16','15','14','13','12','11','21','22','23','24','25','26','27'];
  const LOWER_ARC = ['47','46','45','44','43','42','41','31','32','33','34','35','36','37'];
  const SYSTEM_ANCHOR_BASES = new Set(['bracket_metal', 'bracket_zafiro', 'bracket_autoligable', 'tubo', 'banda']);

  const hasTubeInTooth = useCallback((toothNum: string) => {
    const tooth = teethData[toothNum];
    if (!tooth?.faces) return false;
    return Object.values(tooth.faces).some((face: any) => face?.base?.id === 'tubo');
  }, [teethData]);

  const hasSystemAnchorInTooth = useCallback((toothNum: string) => {
    const tooth = teethData[toothNum];
    if (!tooth?.faces) return false;
    return Object.values(tooth.faces).some((face: any) => {
      const baseId = face?.base?.id;
      return Boolean(baseId && SYSTEM_ANCHOR_BASES.has(baseId));
    });
  }, [teethData]);

  const resolveSmartSystemTeeth = useCallback((fallbackTeeth: string[]) => {
    const fallbackSet = new Set(fallbackTeeth);
    const requestedUpper = UPPER_ARC.filter((num) => fallbackSet.has(num));
    const requestedLower = LOWER_ARC.filter((num) => fallbackSet.has(num));
    const upperHasTube = UPPER_MOLARS.some((num) => hasTubeInTooth(num));
    const lowerHasTube = LOWER_MOLARS.some((num) => hasTubeInTooth(num));
    let scopedCandidates: string[];

    if (upperHasTube || lowerHasTube) {
      scopedCandidates = [];
      if (upperHasTube) scopedCandidates.push(...requestedUpper);
      if (lowerHasTube) scopedCandidates.push(...requestedLower);
    } else {
      scopedCandidates = fallbackTeeth;
    }

    return Array.from(new Set(scopedCandidates)).filter((num) => hasSystemAnchorInTooth(num));
  }, [hasTubeInTooth, hasSystemAnchorInTooth]);

  const bulkApply = useCallback((toolId: string, teethList: string[]) => {
    const tool = CLINICAL_TOOLS.find(t => t.id === toolId);
    if (!tool || tool.type === 'conexion') return;

    isInternalUpdate.current = true;
    const nextTeeth = { ...teethData };
    let modifiedCount = 0;

    teethList.forEach(num => {
      const current = cloneTooth(nextTeeth[num], num);
      nextTeeth[num] = current;
      if (current.ausente) return;

      const defaultFace: 'vestibular' | 'oclusal' = 'vestibular';

      if (tool.type === 'base') {
        current.faces[defaultFace].base = { id: toolId, state: 'instalado' };
        current.faces[defaultFace].color = tool.colorLight || '#E0F2FE';
        modifiedCount++;
      } else if (tool.type === 'auxiliar') {
        const otras = (current.faces[defaultFace].auxiliares || []).filter((a: any) => a.id !== toolId);
        current.faces[defaultFace].auxiliares = [...otras, { id: toolId, state: 'instalado' }];
        modifiedCount++;
      }
    });

    if (modifiedCount > 0) {
      hasUserMadeChange.current = true;
      setTeethData(nextTeeth);
      saveHistory(nextTeeth, connections);
      setSuccessMessage(`${tool.name} aplicado a ${modifiedCount} pieza${modifiedCount > 1 ? 's' : ''}`);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 900);
    }

    isInternalUpdate.current = false;
  }, [teethData, connections]);

  const bulkConnectTool = useCallback((toolId: 'arco_niti' | 'arco_acero' | 'cadeneta', teethList: string[], useTubeSmartTarget = false) => {
    const tool = CLINICAL_TOOLS.find(t => t.id === toolId);
    if (!tool) return;

    isInternalUpdate.current = true;
    let nextConns = [...connections];
    const targetSource = useTubeSmartTarget ? resolveSmartSystemTeeth(teethList) : teethList;
    const targetTeeth = Array.from(new Set(targetSource)).sort((a, b) => Number(a) - Number(b));

    if (targetTeeth.length === 0) {
      isInternalUpdate.current = false;
      setSuccessMessage(`ℹ No hay piezas objetivo para ${tool.name}`);
      return;
    }

    const sameTeethSet = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      return a.every((tooth, idx) => tooth === b[idx]);
    };

    const existingIndex = nextConns.findIndex((conn) => {
      if (conn.toolId !== toolId) return false;
      const sortedConnTeeth = [...conn.teeth].sort((x, y) => Number(x) - Number(y));
      return sameTeethSet(sortedConnTeeth, targetTeeth);
    });

    if (existingIndex >= 0) {
      nextConns.splice(existingIndex, 1);
      setSuccessMessage(`↩ ${tool.name} removido (${targetTeeth.length} piezas)`);
    } else {
      nextConns.push({
        id: `conn_bulk_${toolId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        toolId,
        teeth: [...targetTeeth],
        state: 'instalado',
        timestamp: Date.now(),
      });
      setSuccessMessage(`✓ ${tool.name} conectado (${targetTeeth.length} piezas)`);
    }

    hasUserMadeChange.current = true;
    setConnections(nextConns);
    saveHistory(teethData, nextConns);
    setShowSuccessAnimation(true);
    setTimeout(() => setShowSuccessAnimation(false), 900);

    isInternalUpdate.current = false;
  }, [connections, teethData, resolveSmartSystemTeeth]);

  const statsDetallados = useMemo(() => {
    let totalBases = 0, totalAux = 0, totalInstaladas = 0, totalConFallas = 0;
    const agrupadoBases: Record<string, string[]> = {};
    const agrupadoAux: Record<string, string[]> = {};
    const fallas: any[] = [];
    const ausentes: string[] = [];

    Object.values(teethData).forEach(t => {
      if (t?.ausente) {
        ausentes.push(t.number);
        return;
      }
      
      // Count bases from all faces
      Object.entries(t.faces || {}).forEach(([faceName, faceData]) => {
        if (faceData?.base) {
          totalBases++;
          if (faceData.base.state === 'instalado' || faceData.base.state === 'recementado_ejecutado') totalInstaladas++;
          if (faceData.base.state === 'recementado') totalConFallas++;
          
          const tool = CLINICAL_TOOLS.find(c => c.id === faceData.base?.id);
          const name = tool ? tool.name : 'Base';
          if (!agrupadoBases[name]) agrupadoBases[name] = [];
          if (!agrupadoBases[name].includes(t.number)) {
            agrupadoBases[name].push(t.number);
          }

          if (faceData.base.state === 'recementado') {
            fallas.push({ diente: t.number, cara: faceName, tipo: name });
          }
        }

        // Count auxiliares from this face
        if (faceData?.auxiliares && Array.isArray(faceData.auxiliares) && faceData.auxiliares.length > 0) {
          faceData.auxiliares.forEach((aux: any) => {
            totalAux++;
            const tool = CLINICAL_TOOLS.find(c => c.id === aux.id);
            const name = tool ? tool.name : 'Auxiliar';
            if (!agrupadoAux[name]) agrupadoAux[name] = [];
            if (!agrupadoAux[name].includes(t.number)) {
              agrupadoAux[name].push(t.number);
            }
          });
        }
      });
    });

    return {
      totalBases,
      totalAux,
      totalInstaladas,
      totalConFallas,
      totalAusentes: ausentes.length,
      ausentes,
      fallas,
      agrupadoBases,
      agrupadoAux,
      sistemas: connections,
    };
  }, [teethData, connections]);

  const repuestosPendientes = statsDetallados.fallas.length;
  const aditamentosTotales = statsDetallados.totalAux + statsDetallados.sistemas.length;

  const clasificaciones = useMemo(() => {
    const aparatologia: ClasifItem[] = [];
    const sistemas: ClasifItem[] = [];
    const otros: ClasifItem[] = [];

    const groupedBase: Record<string, ClasifItem> = {};
    const groupedAux: Record<string, ClasifItem> = {};
    const groupedFallas: Record<string, ClasifItem> = {};
    const ausentes: string[] = [];

    Object.values(teethData).forEach(tooth => {
      if (tooth.ausente) {
        ausentes.push(tooth.number);
        return;
      }

      Object.entries(tooth.faces).forEach(([faceName, faceData]) => {
        if (faceData.base) {
          const tool = CLINICAL_TOOLS.find(t => t.id === faceData.base?.id);
          const baseKey = `base_${faceData.base.id}_${faceName}`;
          if (!groupedBase[baseKey]) {
            groupedBase[baseKey] = {
              id: baseKey,
              kind: 'base',
              title: tool?.name || 'Base',
              subtitle: faceName,
              color: tool?.color || COLORS.primary,
              teeth: [],
              toolId: faceData.base.id,
              faceName,
            };
          }
          groupedBase[baseKey].teeth.push(tooth.number);

          if (faceData.base.state === 'recementado') {
            const fallaKey = `falla_${faceData.base.id}_${faceName}`;
            if (!groupedFallas[fallaKey]) {
              groupedFallas[fallaKey] = {
                id: fallaKey,
                kind: 'falla',
                title: `Falla ${tool?.name || 'Aparato'}`,
                subtitle: faceName,
                color: COLORS.error,
                teeth: [],
                toolId: faceData.base.id,
                faceName,
              };
            }
            groupedFallas[fallaKey].teeth.push(tooth.number);
          }
        }

        if (faceData.auxiliares && faceData.auxiliares.length > 0) {
          faceData.auxiliares.forEach((aux: any) => {
            const tool = CLINICAL_TOOLS.find(t => t.id === aux.id);
            const auxKey = `aux_${aux.id}_${faceName}`;
            if (!groupedAux[auxKey]) {
              groupedAux[auxKey] = {
                id: auxKey,
                kind: 'aux',
                title: tool?.name || 'Auxiliar',
                subtitle: faceName,
                color: tool?.color || COLORS.modulo,
                teeth: [],
                toolId: aux.id,
                faceName,
              };
            }
            if (!groupedAux[auxKey].teeth.includes(tooth.number)) {
              groupedAux[auxKey].teeth.push(tooth.number);
            }
          });
        }
      });
    });

    Object.values(groupedBase).forEach(item => {
      item.teeth.sort();
      aparatologia.push(item);
    });
    Object.values(groupedAux).forEach(item => {
      item.teeth.sort();
      aparatologia.push(item);
    });

    const groupedSys: Record<string, ClasifItem> = {};
    connections.forEach(conn => {
      const tool = CLINICAL_TOOLS.find(t => t.id === conn.toolId);
      if (!groupedSys[conn.toolId]) {
        groupedSys[conn.toolId] = {
          id: `sys_${conn.toolId}`,
          kind: 'sistema',
          title: tool?.name || 'Sistema',
          subtitle: 'Conexión',
          color: tool?.color || COLORS.cadeneta,
          teeth: [],
          toolId: conn.toolId,
        };
      }
      conn.teeth.forEach(t => {
        if (!groupedSys[conn.toolId].teeth.includes(t)) groupedSys[conn.toolId].teeth.push(t);
      });
    });
    Object.values(groupedSys).forEach(item => {
      item.teeth.sort();
      sistemas.push(item);
    });

    if (ausentes.length > 0) {
      otros.push({
        id: 'otros_ausentes',
        kind: 'ausente',
        title: 'Ausentes / Extraídos',
        subtitle: 'Dental',
        color: COLORS.secondary,
        teeth: [...ausentes].sort(),
      });
    }
    Object.values(groupedFallas).forEach(item => {
      item.teeth.sort();
      otros.push(item);
    });

    aparatologia.sort((a, b) => a.title.localeCompare(b.title));
    sistemas.sort((a, b) => a.title.localeCompare(b.title));
    otros.sort((a, b) => a.title.localeCompare(b.title));

    return { aparatologia, sistemas, otros };
  }, [teethData, connections]);

  const clasifMap = useMemo(() => {
    const map: Record<string, ClasifItem> = {};
    [...clasificaciones.aparatologia, ...clasificaciones.sistemas, ...clasificaciones.otros].forEach(item => {
      map[item.id] = item;
    });
    return map;
  }, [clasificaciones]);

  const activeDetalle = activeDetalleId ? clasifMap[activeDetalleId] : null;

  useEffect(() => {
    if (activeDetalleId && !clasifMap[activeDetalleId]) {
      setActiveDetalleId(null);
    }
  }, [activeDetalleId, clasifMap]);

  const removeToothFromDetalle = useCallback((item: ClasifItem, tooth: string) => {
    if (!item) return;

    isInternalUpdate.current = true;
    const nextTeeth = { ...teethData };
    let nextConns = [...connections];
    const existing = nextTeeth[tooth];
    if (!existing) {
      isInternalUpdate.current = false;
      return;
    }
    const current = cloneTooth(existing, tooth);
    nextTeeth[tooth] = current;

    if (item.kind === 'base' && item.faceName && item.toolId) {
      const face = current.faces[item.faceName as keyof typeof current.faces];
      if (face?.base?.id === item.toolId) {
        face.base = null;
        face.color = '#FAFAFA';
      }
    }

    if (item.kind === 'aux' && item.faceName && item.toolId) {
      const face = current.faces[item.faceName as keyof typeof current.faces];
      if (face?.auxiliares) {
        face.auxiliares = face.auxiliares.filter((aux: any) => aux.id !== item.toolId);
      }
    }

    if (item.kind === 'sistema' && item.toolId) {
      nextConns = nextConns
        .map(conn => conn.toolId === item.toolId ? { ...conn, teeth: conn.teeth.filter(t => t !== tooth) } : conn)
        .filter(conn => conn.teeth.length > 0);
    }

    if (item.kind === 'ausente') {
      current.ausente = false;
    }

    if (item.kind === 'falla' && item.faceName && item.toolId) {
      const face = current.faces[item.faceName as keyof typeof current.faces];
      if (face?.base?.id === item.toolId && face.base.state === 'recementado') {
        face.base.state = 'instalado';
      }
    }

    setTeethData(nextTeeth);
    setConnections(nextConns);
    saveHistory(nextTeeth, nextConns);
    isInternalUpdate.current = false;
  }, [teethData, connections, saveHistory]);

  return (
    <>
    <ConfirmDialog
      isOpen={showClearConfirm}
      title="Limpiar esquema"
      message="Limpiar todo el esquema de ortodoncia? Esta accion no se puede deshacer."
      confirmLabel="Limpiar todo"
      cancelLabel="Cancelar"
      variant="danger"
      onConfirm={() => { setShowClearConfirm(false); executeClearAll(); }}
      onCancel={() => setShowClearConfirm(false)}
    />
    
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', width: '100%', 
      background: COLORS.cardBg, borderRadius: '20px', overflow: 'hidden', 
      border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadowXl
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
        @keyframes shake { 
          0%, 100% { transform: translateX(0); } 
          25% { transform: translateX(-2px); } 
          75% { transform: translateX(2px); } 
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
        @keyframes toothClick {
          0% { transform: scale(0.95); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1.1); }
        }
        @keyframes faceFlash {
          0% { fill-opacity: 0.5; }
          50% { fill-opacity: 1; }
          100% { fill-opacity: 0.8; }
        }
        @keyframes indicatorPulse {
          0%, 100% { r: 8; }
          50% { r: 10; }
        }
        @keyframes glowRing {
          0% { r: 42; opacity: 0.3; }
          50% { r: 46; opacity: 0; }
          100% { r: 50; opacity: 0; }
        }
        
        .ortho-tooth { 
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
          cursor: pointer; 
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));
        }
        .ortho-tooth:hover { 
          transform: scale(1.12) translateY(-6px); 
          z-index: 30; 
          filter: drop-shadow(0 10px 24px rgba(0,0,0,0.2)); 
        }
        .ortho-tooth:active {
          animation: toothClick 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .ortho-tooth-selected { 
          animation: pulse 1.5s ease-in-out infinite, glowPulse 1.5s ease-in-out infinite;
          animation-fill-mode: both; 
        }
        
        .state-btn { 
          transition: transform 0.12s ease, filter 0.12s ease, background 0.12s ease, color 0.12s ease; 
          position: relative;
          overflow: hidden;
        }
        .state-btn:hover { 
          transform: translateY(-1px); 
          filter: brightness(0.98); 
        }
        .state-btn:active { 
          transform: translateY(0); 
        }
        
        .tool-btn { 
          transition: transform 0.12s ease, background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
          position: relative;
          overflow: hidden;
        }
        .tool-btn:hover { 
          background: #e5e7eb !important; 
          box-shadow: ${COLORS.shadowSm}; 
          transform: translateY(-1px);
        }
        
        .dashboard-card { 
          animation: fadeInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; 
          transition: all 0.3s ease; 
          box-shadow: ${COLORS.shadowSm};
        }
        .dashboard-card:hover { 
          transform: translateY(-4px); 
          box-shadow: ${COLORS.shadowLg}; 
          border-color: ${COLORS.primary}40 !important; 
        }
        
        .success-toast { 
          animation: slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important; 
          position: fixed; 
          bottom: 20px; 
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          max-width: 90%;
        }
        
        .odontogram-container { 
          overflow-x: auto; 
          overflow-y: visible; 
          scrollbar-width: thin; 
          scroll-behavior: smooth;
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
          transition: all 0.2s ease;
        }
        .odontogram-container::-webkit-scrollbar-thumb:hover { 
          background: ${COLORS.textLight}; 
        }
        
        .odontogram-row { 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          gap: 2px; 
          min-width: max-content; 
          animation: fadeInUp 0.5s ease-out backwards;
        }
      `}</style>
      
      {/* Header gris claro */}
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
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: COLORS.primaryDark }}>Odontograma Ortodontico</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: COLORS.textLight }}>Gestion visual de aparatologia</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', background: COLORS.cardBg, borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadowSm }}>
            <button onClick={undo} disabled={historyIndex === 0} style={{ padding: '8px 14px', background: 'transparent', border: 'none', borderRight: `1px solid ${COLORS.border}`, cursor: historyIndex === 0 ? 'not-allowed' : 'pointer', opacity: historyIndex === 0 ? 0.4 : 1 }}>
              <Undo size={16} color={COLORS.text} />
            </button>
            <button onClick={redo} disabled={historyIndex === history.length - 1} style={{ padding: '8px 14px', background: 'transparent', border: 'none', cursor: historyIndex === history.length - 1 ? 'not-allowed' : 'pointer', opacity: historyIndex === history.length - 1 ? 0.4 : 1 }}>
              <Redo size={16} color={COLORS.text} />
            </button>
          </div>
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: COLORS.errorLight, border: `1px solid ${COLORS.error}40`, color: COLORS.error, borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, boxShadow: COLORS.shadowSm }}>
            <Trash size={14} /> Limpiar
          </button>
        </div>
      </div>

      {/* Panel de estados en grises */}
      <div style={{ padding: '12px 24px', background: COLORS.secondaryLight, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STATES.map(state => (
              <button
                key={state.id}
                onClick={() => setActiveState(state.id)}
                className="state-btn"
                title={state.tooltip}
                style={{
                  padding: '10px 18px',
                  background: activeState === state.id ? state.color : '#E5E7EB',
                  color: activeState === state.id ? '#FFFFFF' : '#374151',
                  border: 'none',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.12s ease',
                  boxShadow: activeState === state.id ? `inset 0 0 0 1px ${state.color}, 0 8px 20px ${state.color}22` : 'inset 0 0 0 1px #D1D5DB',
                  position: 'relative'
                }}
              >
                {state.name}
              </button>
            ))}
          </div>
          
          {lastUpdateLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: COLORS.cardBg, padding: '6px 16px', borderRadius: '30px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadowSm }}>
              <TrendingUp size={14} color={COLORS.primaryDark} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textLight }}>Última modificación:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text }}>{lastUpdateLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', padding: '20px' }}>
        
        {/* Panel izquierdo - Barra de herramientas */}
        <div style={{ width: '220px', flexShrink: 0 }}>
          {/* Herramienta activa */}
          <div className="dashboard-card" style={{ 
            background: '#f3f4f6', borderRadius: '14px', 
            border: `1px solid ${COLORS.border}`, marginBottom: '16px',
            padding: '14px', display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: COLORS.shadowLg
          }}>
            <div style={{ 
              width: '48px', height: '48px',
              background: (CLINICAL_TOOLS.find(t=>t.id === activeTool)?.colorLight || COLORS.primaryLight),
              borderRadius: '12px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `2px solid ${CLINICAL_TOOLS.find(t=>t.id === activeTool)?.color || COLORS.primary}`,
              boxShadow: COLORS.shadowSm
            }}>
              {React.createElement(CLINICAL_TOOLS.find(t=>t.id === activeTool)?.icon || Square, { size: 24, color: CLINICAL_TOOLS.find(t=>t.id === activeTool)?.color || COLORS.primary })}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.text }}>
                {CLINICAL_TOOLS.find(t=>t.id === activeTool)?.name}
              </div>
              <div style={{ fontSize: '11px', color: COLORS.textLight }}>
                {CLINICAL_TOOLS.find(t=>t.id === activeTool)?.category}
              </div>
            </div>
          </div>

          {/* Catalogo de herramientas - SIN EMOTICONES */}
          <div style={{ 
            background: '#f3f4f6', borderRadius: '14px', 
            border: `1px solid ${COLORS.border}`, overflow: 'hidden',
            boxShadow: COLORS.shadowLg
          }}>
            <div style={{ padding: '10px 14px', background: '#e5e7eb', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Herramientas Clínicas</span>
            </div>
            <div style={{ padding: '10px', maxHeight: '360px', overflowY: 'auto' }}>
              {Object.entries(
                CLINICAL_TOOLS.reduce((acc, tool) => {
                  if (!acc[tool.category]) acc[tool.category] = [];
                  acc[tool.category].push(tool);
                  return acc;
                }, {} as Record<string, typeof CLINICAL_TOOLS>)
              ).map(([category, tools]) => (
                <div key={category} style={{ marginBottom: '10px', background: '#ffffff', borderRadius: '10px', border: `1px solid ${COLORS.border}`, padding: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: COLORS.text, textTransform: 'uppercase', padding: '6px 8px', letterSpacing: '0.6px' }}>{category}</div>
                  {tools.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      onMouseEnter={() => setActiveToolHover(tool.id)}
                      onMouseLeave={() => setActiveToolHover(null)}
                      className="tool-btn"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: activeTool === tool.id ? tool.colorLight : 'transparent',
                        border: activeTool === tool.id ? `1px solid ${tool.color}` : '1px solid transparent',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: activeTool === tool.id ? 700 : 500,
                        fontSize: '12px',
                        color: activeTool === tool.id ? tool.color : COLORS.text,
                        marginBottom: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <tool.icon size={14} color={activeTool === tool.id ? tool.color : COLORS.textMuted} />
                      <span>{tool.name}</span>
                      {activeToolHover === tool.id && <Sparkles size={10} style={{ marginLeft: 'auto', color: tool.color }} />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{ flex: 1, minWidth: 0 }}>
          
          {/* Barra de seleccion masiva */}
          <div style={{ 
            background: '#f3f4f6', borderRadius: '16px', 
            padding: '10px 12px', marginBottom: '20px',
            display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
            justifyContent: 'center', border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.shadowSm
          }}>
            {[
              { label: 'Brackets Sup.', toolId: 'bracket_metal', teeth: UPPER_NO_WISDOM, icon: Square, color: COLORS.bracketMetal },
              { label: 'Brackets Inf.', toolId: 'bracket_metal', teeth: LOWER_NO_WISDOM, icon: Square, color: COLORS.bracketMetal },
              { label: 'Tubos Sup.', toolId: 'tubo', teeth: UPPER_MOLARS, icon: Circle, color: COLORS.tubo },
              { label: 'Tubos Inf.', toolId: 'tubo', teeth: LOWER_MOLARS, icon: Circle, color: COLORS.tubo },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => bulkApply(btn.toolId, btn.teeth)}
                style={{
                  padding: '10px 14px',
                  background: '#E5E7EB',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.12s ease',
                  boxShadow: 'inset 0 0 0 1px #D1D5DB'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {React.createElement(btn.icon, { size: 12, color: '#4B5563' })} {btn.label}
              </button>
            ))}

            <button
              onClick={() => bulkConnectTool('arco_niti', [...UPPER_ARC, ...LOWER_ARC], true)}
              style={{
                padding: '10px 14px',
                background: '#E5E7EB',
                border: 'none',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
                boxShadow: 'inset 0 0 0 1px #D1D5DB'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Conectar arco NiTi (si hay tubos, completa automáticamente superior/inferior)"
            >
              <Link size={12} color="#4B5563" /> Arco NiTi
            </button>

            <button
              onClick={() => bulkConnectTool('arco_acero', [...UPPER_ARC, ...LOWER_ARC], true)}
              style={{
                padding: '10px 14px',
                background: '#E5E7EB',
                border: 'none',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
                boxShadow: 'inset 0 0 0 1px #D1D5DB'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Conectar arco de acero (si hay tubos, completa automáticamente superior/inferior)"
            >
              <Link size={12} color="#4B5563" /> Arco Acero
            </button>

            <button
              onClick={() => bulkConnectTool('cadeneta', UPPER_ARC, true)}
              style={{
                padding: '10px 14px',
                background: '#E5E7EB',
                border: 'none',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
                boxShadow: 'inset 0 0 0 1px #D1D5DB'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Aplicar cadeneta en arcada superior"
            >
              <Link size={12} color="#4B5563" /> Cadeneta Sup.
            </button>

            <button
              onClick={() => bulkConnectTool('cadeneta', LOWER_ARC, true)}
              style={{
                padding: '10px 14px',
                background: '#E5E7EB',
                border: 'none',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
                boxShadow: 'inset 0 0 0 1px #D1D5DB'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Aplicar cadeneta en arcada inferior"
            >
              <Link size={12} color="#4B5563" /> Cadeneta Inf.
            </button>

            {/* Botones de ajustes clínicos */}
            <button
              onClick={() => { if (onAlambreAdjustment) onAlambreAdjustment(); }}
              style={{
                padding: '10px 14px',
                background: '#E5E7EB',
                border: 'none',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
                boxShadow: 'inset 0 0 0 1px #D1D5DB'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Registrar ajuste de arco realizado en esta sesión"
            >
              <Wrench size={12} color="#4B5563" /> Ajuste de Alambre
            </button>
            
            <button
              onClick={() => { if (onLigatureChange) onLigatureChange(); }}
              style={{
                padding: '10px 14px',
                background: '#E5E7EB',
                border: 'none',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
                boxShadow: 'inset 0 0 0 1px #D1D5DB'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Registrar cambio de ligaduras/cauchos en esta sesión"
            >
              <Sparkles size={12} color="#4B5563" /> Cambio de Ligaduras
            </button>
          </div>

          {/* Odontograma visual */}
          <div className="odontogram-container" style={{ 
            background: '#f8fafc', borderRadius: '18px', 
            border: `1.5px solid ${COLORS.border}`, padding: '24px 20px',
            marginBottom: '20px', boxShadow: COLORS.shadowXl,
            overflowX: 'auto', overflowY: 'visible'
          }}>
            <div style={{ minWidth: 'fit-content' }}>
              {/* Arcada superior */}
              <div className="odontogram-row" style={{ marginBottom: '28px', justifyContent: 'center' }}>
                {upperTeeth.map(num => (
                  <ToothGraphic
                    key={num}
                    number={num}
                    data={getTooth(num)}
                    isSelected={selectedTooth === num}
                    onFaceClick={handleFaceClick}
                    isWireActive={connections.some(c => (c.toolId === 'arco_niti' || c.toolId === 'arco_acero') && c.teeth.includes(num))}
                    isChainActive={connections.some(c => c.toolId === 'cadeneta' && c.teeth.includes(num))}
                    isSpringActive={connections.some(c => c.toolId === 'resorte' && c.teeth.includes(num))}
                  />
                ))}
              </div>
              
              {/* Linea media */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ width: '80px', height: '2px', background: `linear-gradient(90deg, transparent, ${COLORS.borderDark}, transparent)` }} />
              </div>
              
              {/* Arcada inferior */}
              <div className="odontogram-row" style={{ justifyContent: 'center' }}>
                {lowerTeeth.map(num => (
                  <ToothGraphic
                    key={num}
                    number={num}
                    data={getTooth(num)}
                    isSelected={selectedTooth === num}
                    onFaceClick={handleFaceClick}
                    isWireActive={connections.some(c => (c.toolId === 'arco_niti' || c.toolId === 'arco_acero') && c.teeth.includes(num))}
                    isChainActive={connections.some(c => c.toolId === 'cadeneta' && c.teeth.includes(num))}
                    isSpringActive={connections.some(c => c.toolId === 'resorte' && c.teeth.includes(num))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Resumen de métricas debajo del odontograma */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '22px' }}>
            <div style={{ borderRadius: '12px', boxShadow: COLORS.shadowSm, border: `1px solid ${COLORS.border}`, background: '#f3f4f6', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <Square size={13} color={COLORS.arco} />
                <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.text }}>{statsDetallados.totalBases}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}>Bases Instaladas</div>
            </div>

            <div style={{ borderRadius: '12px', boxShadow: COLORS.shadowSm, border: `1px solid ${COLORS.error}40`, background: '#fff1f2', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <AlertTriangle size={13} color={COLORS.error} />
                <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.error }}>{statsDetallados.totalConFallas}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.error }}>Fallas Activas</div>
            </div>

            <div style={{ borderRadius: '12px', boxShadow: COLORS.shadowSm, border: `1px solid ${COLORS.error}30`, background: '#fef2f2', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <Wrench size={13} color={COLORS.error} />
                <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.error }}>{repuestosPendientes}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}>Repuestos Pendientes</div>
            </div>

            <div style={{ borderRadius: '12px', boxShadow: COLORS.shadowSm, border: `1px solid ${COLORS.border}`, background: '#f3f4f6', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <Circle size={13} color={COLORS.modulo} />
                <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.text }}>{statsDetallados.totalAux}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}>Auxiliares</div>
            </div>

            <div style={{ borderRadius: '12px', boxShadow: COLORS.shadowSm, border: `1px solid ${COLORS.border}`, background: '#f3f4f6', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <Link size={13} color={COLORS.cadeneta} />
                <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.text }}>{statsDetallados.sistemas.length}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}>Sistemas Activos</div>
            </div>

            <div style={{ borderRadius: '12px', boxShadow: COLORS.shadowSm, border: `1px solid ${COLORS.border}`, background: '#f3f4f6', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <Layers size={13} color={COLORS.secondary} />
                <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.text }}>{aditamentosTotales}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textLight }}>Aditamentos</div>
            </div>
          </div>

          {/* Desglose detallado */}
          <div style={{ 
            background: '#f3f4f6', borderRadius: '14px', 
            border: `1px solid ${COLORS.border}`, overflow: 'hidden',
            boxShadow: COLORS.shadowLg,
            marginLeft: '-236px',
            width: 'calc(100% + 236px)'
          }}>
            <div style={{ padding: '10px 14px', background: '#e5e7eb', borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: COLORS.text, margin: 0 }}>Desglose de aparatología</h3>
            </div>

            <div style={{ background: '#f9fafb', padding: '14px', position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#eef2f7', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text, textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.6px' }}>Bases y Auxiliares</h4>
                  {clasificaciones.aparatologia.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {clasificaciones.aparatologia.map(item => (
                        <button
                          key={item.id}
                          onClick={e => {
                            if (activeDetalleId === item.id) {
                              setActiveDetalleId(null);
                              return;
                            }
                            openDetalleNearButton(item.id, e.currentTarget);
                          }}
                          style={{
                            border: `1px solid ${item.color}55`,
                            background: activeDetalleId === item.id ? `${item.color}20` : '#ffffff',
                            color: COLORS.text,
                            borderRadius: '10px',
                            padding: '7px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: COLORS.shadowSm,
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                          <span>{item.title} - {item.subtitle}</span>
                          <span style={{ fontSize: '10px', color: COLORS.textMuted }}>({item.teeth.length})</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: COLORS.textLight }}>Sin aparatología registrada.</div>
                  )}
                </div>

                <div style={{ background: '#eef2f7', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text, textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.6px' }}>Sistemas y Otros</h4>
                  {[...clasificaciones.sistemas, ...clasificaciones.otros].length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {[...clasificaciones.sistemas, ...clasificaciones.otros].map(item => (
                        <button
                          key={item.id}
                          onClick={e => {
                            if (activeDetalleId === item.id) {
                              setActiveDetalleId(null);
                              return;
                            }
                            openDetalleNearButton(item.id, e.currentTarget);
                          }}
                          style={{
                            border: `1px solid ${item.color}55`,
                            background: activeDetalleId === item.id ? `${item.color}20` : '#ffffff',
                            color: COLORS.text,
                            borderRadius: '10px',
                            padding: '7px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: COLORS.shadowSm,
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                          <span>{item.title} - {item.subtitle}</span>
                          <span style={{ fontSize: '10px', color: COLORS.textMuted }}>({item.teeth.length})</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: COLORS.textLight }}>Sin sistemas ni otros registros.</div>
                  )}
                </div>
              </div>

              {activeDetalle && (
                <div
                  ref={detalleWindowRef}
                  style={{
                    position: 'fixed',
                    left: `${detalleWindowPos.x}px`,
                    top: `${detalleWindowPos.y}px`,
                    width: '420px',
                    maxWidth: '92vw',
                    background: '#ffffff',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '16px',
                    boxShadow: COLORS.shadowXl,
                    zIndex: 90,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeDetalle.color, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeDetalle.title}</div>
                        <div style={{ fontSize: '11px', color: COLORS.textLight }}>{activeDetalle.subtitle} • {activeDetalle.teeth.length} piezas</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', maxHeight: '280px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                      {activeDetalle.teeth.map(t => (
                        <div key={`${activeDetalle.id}-${t}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: `1px solid ${COLORS.borderDark}`, borderRadius: '8px', padding: '4px 8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text }}>#{t}</span>
                          <button
                            onClick={() => removeToothFromDetalle(activeDetalle, t)}
                            style={{ border: 'none', background: 'transparent', color: COLORS.error, cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                            title="Eliminar de la clase"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Botón de enlace dinámico para fallas */}
      {statsDetallados.totalConFallas > 0 && onNavigateToFailures && (
        <div style={{ padding: '0 24px 20px 24px' }}>
          <button
            onClick={onNavigateToFailures}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              background: `linear-gradient(135deg, ${COLORS.error} 0%, #dc2626 100%)`,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: `0 4px 14px ${COLORS.error}40`,
              transition: 'all 0.3s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 20px ${COLORS.error}50`;
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 14px ${COLORS.error}40`;
            }}
          >
            <AlertTriangle size={18} />
            <span>Ver Hallazgos y Cotizar Reposiciones ({statsDetallados.totalConFallas} falla{statsDetallados.totalConFallas > 1 ? 's' : ''})</span>
          </button>
        </div>
      )}
    </div>

    {/* Toast de exito con animación suave */}
    {showSuccessAnimation && (
      <div 
        className="success-toast" 
        style={{ 
          background: COLORS.success, 
          color: '#FFFFFF', 
          padding: '12px 20px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          boxShadow: COLORS.shadowXl,
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          fontWeight: 600,
          fontSize: '14px'
        }}
      >
        <CheckCircle size={18} style={{ animation: 'pulseScale 0.6s ease-out' }} /> 
        {successMessage}
      </div>
    )}
    </>
  );
};