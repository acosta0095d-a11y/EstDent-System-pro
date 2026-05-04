import React, { useState, useEffect } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { usePatient } from '../../../core/context/PatientContext';
import { formatPatientSerial } from '../pages/patientUtils';
import { formatPatientRh } from '../../../shared/lib/patientRhUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const BLUE = '#29b2e8';

const makeDefault = (): Record<string, any> => ({
  // S1 Estado de Salud General
  salud_general: '',
  motivo_primera_consulta: '',
  medico_tratante: '',
  // S2 Antecedentes Patológicos
  s2_diabetes: '', s2_diabetes_det: '',
  s2_hipertension: '', s2_hipertension_det: '',
  s2_cardiaco: '', s2_cardiaco_det: '',
  s2_asma: '', s2_asma_det: '',
  s2_cancer: '', s2_cancer_det: '',
  s2_tiroideo: '', s2_tiroideo_det: '',
  s2_renal: '', s2_renal_det: '',
  s2_hepatico: '', s2_hepatico_det: '',
  s2_artritis: '', s2_artritis_det: '',
  s2_osteoporosis: '', s2_epilepsia: '',
  s2_coagulacion: '', s2_psiquiatrico: '',
  s2_otros: '',
  // S3 Medicamentos
  s3_toma_med: '', s3_medicamentos: '',
  s3_suplementos: '', s3_sin_receta: '',
  // S4 Alergias
  s4_tiene_alergia: '',
  s4_penicilina: false, s4_latex: false, s4_aspirina: false,
  s4_anestesico: false, s4_yodo: false, s4_sulfas: false,
  s4_ibuprofeno: false, s4_codeina: false,
  s4_tipo_reaccion: '', s4_descripcion: '',
  s4_alimento_alergia: '',
  s4_dental_reaccion: '', s4_dental_det: '',
  // S5 Cardiovascular
  s5cv_dolor: '', s5cv_palpitaciones: '', s5cv_edema: '',
  s5cv_soplo: '', s5cv_marcapaso: '', s5cv_infarto: '', s5cv_infarto_cuando: '',
  // S5 Respiratorio
  s5r_disnea: '', s5r_tos: '', s5r_asma_act: '', s5r_ronquidos: '',
  s5r_inhalador: '', s5r_inhalador_cual: '',
  // S5 Gastrointestinal
  s5g_reflujo: '', s5g_ulcera: '', s5g_crohn: '', s5g_deglucion: '',
  // S5 Neurológico
  s5n_cefaleas: '', s5n_mareos: '', s5n_neuropatia: '', s5n_memoria: '',
  // S5 Endocrino
  s5e_peso: '', s5e_metabolico: '', s5e_tiroides: '',
  // S6 Infecciosos
  s6_its: '',
  s6_hep_b: false, s6_hep_c: false, s6_vih: false, s6_vph: false,
  s6_sifilis: false, s6_herpes: false, s6_gonorrea: false, s6_otra: '',
  s6_estado_its: '', s6_antiretrovirales: '',
  s6_transfusion: '', s6_transfusion_cuando: '',
  s6_trasplante: '', s6_trasplante_organo: '',
  // S7 Quirúrgicos
  s7_cirugias: '', s7_cirugias_det: '',
  s7_hosp: '', s7_hosp_det: '',
  s7_implante: '', s7_lista_espera: '',
  // S8 Gineco
  s8_embarazada: '', s8_semanas: '',
  s8_lactando: '', s8_anticonceptivos: '', s8_anticon_cuales: '',
  s8_terapia_h: '', s8_ultima_mens: '',
  s8_num_embarazos: '', s8_menopausia: '',
  // S9 Hábitos
  s9_tabaco: '', s9_tab_cantidad: '', s9_tab_anios: '',
  s9_alcohol: '', s9_alc_bebidas: '',
  s9_drogas: '', s9_drogas_cuales: '',
  s9_ejercicio: '', s9_ejercicio_tipo: '',
  s9_alimentacion: '', s9_sueno: '',
  s9_estres: '5', s9_ocupacion: '', s9_exposicion: '',
  // S10 Familiares
  s10_diab: false, s10_hiper: false, s10_cancer_oral: false,
  s10_cancer_otro: false, s10_cardiaco: false, s10_renal: false,
  s10_mental: false, s10_malocusion: false, s10_periodontal: false,
  s10_detalle: '',
  // S11 Odontológicos
  s11_ultima_visita: '',
  s11_caries: false, s11_extrac: false, s11_endodoncia: false,
  s11_ortodoncia: false, s11_implantes: false, s11_protesis_prev: false,
  s11_cirugia: false, s11_blanq: false, s11_perio: false,
  s11_experiencia: '', s11_ansiedad: '', s11_ansiedad_nivel: '0',
  s11_protesis_activa: '', s11_ortodoncia_activa: '',
  s11_sangrado: '', s11_bruxismo: '', s11_protector: '',
  s11_cepillado: '', s11_cepillo: '', s11_hilo: '', s11_enjuague: '',
  // S12 Observaciones
  s12_obs: '', s12_llenado_paciente: '',
  s12_firma: false,
  s12_fecha: new Date().toISOString().split('T')[0],
});

// ─── Sub-components ────────────────────────────────────────────────────────────
const Pills = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(value === opt ? '' : opt)}
        style={{
          padding: '5px 14px',
          borderRadius: 20,
          border: `1.5px solid ${value === opt ? BLUE : '#e2e8f0'}`,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all .12s',
          background: value === opt ? BLUE : '#fff',
          color: value === opt ? '#fff' : '#64748b',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {opt}
      </button>
    ))}
  </div>
);

const Sec = ({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      marginBottom: 14,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '11px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #e8ecef',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: '#64748b',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {num}
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
        {title}
      </span>
    </div>
    <div style={{ padding: '20px 22px' }}>{children}</div>
  </div>
);

const SubSec = ({ title }: { title: string }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      borderBottom: '1px solid #f1f5f9',
      paddingBottom: 8,
      marginBottom: 14,
      marginTop: 20,
    }}
  >
    {title}
  </div>
);

const Fld = ({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
      {label}
      {sub && (
        <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>
          {sub}
        </span>
      )}
    </div>
    {children}
  </div>
);

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  color: '#1e293b',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const TEXTAREA: React.CSSProperties = {
  ...INPUT,
  minHeight: 80,
  resize: 'vertical',
};

const Col2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
    {children}
  </div>
);

const Col3 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
    {children}
  </div>
);

const ChkRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      color: '#334155',
      cursor: 'pointer',
      userSelect: 'none',
      padding: '4px 0',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 15, height: 15, accentColor: BLUE, cursor: 'pointer', flexShrink: 0 }}
    />
    {label}
  </label>
);

// ─── Main Export ──────────────────────────────────────────────────────────────
export const FullClinicalHistory = ({
  patientId,
  initialData,
  onSave,
  onComplete,
  onBack,
  saveLabel = 'Guardar Historia Clínica',
}: {
  patientId: string;
  initialData?: any;
  onSave?: (data: any) => void;
  onComplete?: () => void;
  onBack?: () => void;
  saveLabel?: string;
}) => {
  const { loadPatientById } = usePatient();
  const [d, setD] = useState<Record<string, any>>(makeDefault());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patientProfile, setPatientProfile] = useState<{ nombre?: string; apellidos?: string; tipo_sangre_rh?: string } | null>(null);

  useEffect(() => {
    if (initialData && typeof initialData === 'object' && Object.keys(initialData).length > 0) {
      // Merge with defaults so new fields always have a value
      setD({ ...makeDefault(), ...initialData });
    }
  }, [initialData]);

  useEffect(() => {
    let mounted = true;

    const loadPatientProfile = async () => {
      if (!patientId) return;

      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', patientId)
        .single();

      if (!mounted || error || !data) return;

      setPatientProfile({
        nombre: data.nombre,
        apellidos: data.apellidos,
        tipo_sangre_rh: data.tipo_sangre_rh,
      });
    };

    loadPatientProfile();

    return () => {
      mounted = false;
    };
  }, [patientId]);

  const set = (key: string, val: any) =>
    setD((prev) => ({ ...prev, [key]: val }));

  const handleSave = async (skip = false) => {
    setLoading(true);
    try {
      const payload = skip
        ? {
            clinical_history: { _skipped: true, fecha: new Date().toISOString() },
            historia_completa: false,
          }
        : {
            clinical_history: { ...d, _version: 2, _saved: new Date().toISOString() },
            historia_completa: true,
          };

      const { error } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', patientId);

      if (error) throw error;

      if (patientId) await loadPatientById(patientId);

      setMsg({
        type: 'success',
        text: skip
          ? 'Historia omitida. Se puede completar mas tarde desde el dashboard del paciente.'
          : 'Historia Clinica guardada correctamente.',
      });
      setTimeout(() => setMsg(null), 4500);

      if (!skip && onSave) onSave(d);
      if (onComplete) onComplete();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: `Error al guardar: ${err?.message || 'Intente nuevamente'}`,
      });
      setTimeout(() => setMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const YN = ['SI', 'NO'];
  const YNT = ['SI', 'NO', 'EN TRATAMIENTO'];

  return (
    <>
      <style>{`
        .fch-wrap { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#f4f6f9; display:flex; flex-direction:column; height:100%; }
        .fch-body { overflow-y:auto; flex:1; padding:22px 24px; }
        .fch-inp:focus { border-color:${BLUE} !important; box-shadow:0 0 0 3px rgba(41,178,232,.12) !important; outline:none !important; }
        .fch-inp:hover { border-color:#cbd5e1; }
      `}</style>

      <div className="fch-wrap">

        {/* ── HEADER ── */}
        <div
          style={{
            background: 'linear-gradient(145deg,#ffffff 0%,#f1f5f9 100%)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexShrink: 0,
            borderBottom: '1px solid #e2e8f0',
            boxShadow:
              '0 4px 14px rgba(163,177,198,.28), 0 1px 0 rgba(255,255,255,.9) inset',
          }}
        >
          {/* Logo chip — neumorphic */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(145deg,#f0f4f8,#d9e2ec)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow:
                '4px 4px 10px rgba(163,177,198,.45), -3px -3px 8px rgba(255,255,255,.98)',
            }}
          >
            <span style={{ color: BLUE, fontWeight: 900, fontSize: 18 }}>E</span>
          </div>

          <div>
            <div style={{ color: '#1e293b', fontWeight: 800, fontSize: 15, lineHeight: 1 }}>
              EstDent
            </div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>
              Historia Clinica Base
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 32, background: '#e2e8f0', marginLeft: 4 }} />

          {/* Ficha badge — 3D pill */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: 'linear-gradient(145deg,#f8fafc,#edf2f7)',
              border: '1px solid #e2e8f0',
              boxShadow:
                '3px 3px 8px rgba(163,177,198,.3), -2px -2px 6px rgba(255,255,255,.95)',
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '.03em',
            }}
          >
            Ficha <span style={{ color: '#334155' }}>{formatPatientSerial(patientId)}</span>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: 'linear-gradient(145deg,#f8fafc,#edf2f7)',
              border: '1px solid #e2e8f0',
              boxShadow:
                '3px 3px 8px rgba(163,177,198,.3), -2px -2px 6px rgba(255,255,255,.95)',
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '.03em',
            }}
          >
            RH <span style={{ color: '#334155' }}>{formatPatientRh(patientProfile?.tipo_sangre_rh)}</span>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                fontSize: 10,
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              Documento Confidencial
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="fch-body">

          {/* S1 — Estado de Salud General */}
          <Sec num={1} title="Estado de Salud General">
            <Fld label="Estado de salud general percibido">
              <Pills
                value={d.salud_general}
                options={['Excelente', 'Buena', 'Regular', 'Mala']}
                onChange={(v) => set('salud_general', v)}
              />
            </Fld>
            <Col2>
              <Fld label="Motivo de primera consulta / derivacion">
                <input
                  className="fch-inp"
                  style={INPUT}
                  value={d.motivo_primera_consulta}
                  onChange={(e) => set('motivo_primera_consulta', e.target.value)}
                  placeholder="Ej: dolor, estetica, control..."
                />
              </Fld>
              <Fld label="Medico de cabecera / tratante">
                <input
                  className="fch-inp"
                  style={INPUT}
                  value={d.medico_tratante}
                  onChange={(e) => set('medico_tratante', e.target.value)}
                  placeholder="Nombre del medico..."
                />
              </Fld>
            </Col2>
          </Sec>

          {/* S2 — Antecedentes Patológicos */}
          <Sec num={2} title="Antecedentes Personales Patologicos">
            {(
              [
                ['s2_diabetes', 'Diabetes'],
                ['s2_hipertension', 'Hipertension Arterial'],
                ['s2_cardiaco', 'Cardiopatia / Enf. Cardiaca'],
                ['s2_asma', 'Asma / EPOC'],
                ['s2_cancer', 'Cancer (activo o en remision)'],
                ['s2_tiroideo', 'Enf. Tiroidea'],
                ['s2_renal', 'Enf. Renal Cronica'],
                ['s2_hepatico', 'Enf. Hepatica / Higado'],
                ['s2_artritis', 'Artritis / Reumatismo'],
                ['s2_osteoporosis', 'Osteoporosis'],
                ['s2_epilepsia', 'Epilepsia / Convulsiones'],
                ['s2_coagulacion', 'Trastornos de Coagulacion'],
                ['s2_psiquiatrico', 'Trastornos Psiquiatricos'],
              ] as [string, string][]
            ).map(([key, label]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: '#334155', minWidth: 220 }}
                  >
                    {label}
                  </span>
                  <Pills
                    value={d[key]}
                    options={YNT}
                    onChange={(v) => set(key, v)}
                  />
                </div>
                {(d[key] === 'SI' || d[key] === 'EN TRATAMIENTO') && (
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d[key + '_det'] || ''}
                    onChange={(e) => set(key + '_det', e.target.value)}
                    placeholder="Detalle: medicacion, especialista, tiempo de diagnostico..."
                  />
                )}
              </div>
            ))}
            <Fld label="Otras condiciones medicas relevantes">
              <textarea
                className="fch-inp"
                style={TEXTAREA}
                value={d.s2_otros}
                onChange={(e) => set('s2_otros', e.target.value)}
                placeholder="Otras enfermedades o condiciones importantes..."
              />
            </Fld>
          </Sec>

          {/* S3 — Medicamentos */}
          <Sec num={3} title="Medicamentos Actuales">
            <Fld label="Toma algun medicamento actualmente?">
              <Pills value={d.s3_toma_med} options={YN} onChange={(v) => set('s3_toma_med', v)} />
            </Fld>
            {d.s3_toma_med === 'SI' && (
              <Fld label="Liste los medicamentos" sub="(nombre, dosis, frecuencia, motivo)">
                <textarea
                  className="fch-inp"
                  style={{ ...TEXTAREA, minHeight: 100 }}
                  value={d.s3_medicamentos}
                  onChange={(e) => set('s3_medicamentos', e.target.value)}
                  placeholder="Ej: Enalapril 10mg 1 vez/dia (hipertension), Metformina 500mg 2 veces/dia (diabetes)..."
                />
              </Fld>
            )}
            <Col2>
              <Fld label="Suplementos vitaminicos?">
                <Pills
                  value={d.s3_suplementos}
                  options={YN}
                  onChange={(v) => set('s3_suplementos', v)}
                />
              </Fld>
              <Fld label="Medicamentos sin receta frecuentes">
                <input
                  className="fch-inp"
                  style={INPUT}
                  value={d.s3_sin_receta}
                  onChange={(e) => set('s3_sin_receta', e.target.value)}
                  placeholder="Ej: Ibuprofeno, aspirina..."
                />
              </Fld>
            </Col2>
          </Sec>

          {/* S4 — Alergias */}
          <Sec num={4} title="Alergias e Hipersensibilidades">
            <Fld label="Conoce alguna alergia a medicamentos?">
              <Pills
                value={d.s4_tiene_alergia}
                options={['SI', 'NO', 'DESCONOCE']}
                onChange={(v) => set('s4_tiene_alergia', v)}
              />
            </Fld>
            {d.s4_tiene_alergia === 'SI' && (
              <>
                <Fld label="Seleccione alergias conocidas">
                  <Col3>
                    {(
                      [
                        ['s4_penicilina', 'Penicilina / Amoxicilina'],
                        ['s4_latex', 'Latex'],
                        ['s4_aspirina', 'Aspirina / AINEs'],
                        ['s4_anestesico', 'Anestesicos Locales'],
                        ['s4_yodo', 'Yodo / Povidona'],
                        ['s4_sulfas', 'Sulfas'],
                        ['s4_ibuprofeno', 'Ibuprofeno'],
                        ['s4_codeina', 'Codeina'],
                      ] as [string, string][]
                    ).map(([k, l]) => (
                      <ChkRow
                        key={k}
                        label={l}
                        checked={!!d[k]}
                        onChange={(v) => set(k, v)}
                      />
                    ))}
                  </Col3>
                </Fld>
                <Col2>
                  <Fld label="Tipo de reaccion alergica">
                    <select
                      className="fch-inp"
                      style={INPUT}
                      value={d.s4_tipo_reaccion}
                      onChange={(e) => set('s4_tipo_reaccion', e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Urticaria">Urticaria</option>
                      <option value="Anafilaxia">Anafilaxia</option>
                      <option value="Edema">Edema</option>
                      <option value="Erupcion">Erupcion cutanea</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </Fld>
                  <Fld label="Descripcion detallada">
                    <input
                      className="fch-inp"
                      style={INPUT}
                      value={d.s4_descripcion}
                      onChange={(e) => set('s4_descripcion', e.target.value)}
                      placeholder="Describa la reaccion..."
                    />
                  </Fld>
                </Col2>
              </>
            )}
            <Col2>
              <Fld label="Alergia a algun alimento?">
                <input
                  className="fch-inp"
                  style={INPUT}
                  value={d.s4_alimento_alergia}
                  onChange={(e) => set('s4_alimento_alergia', e.target.value)}
                  placeholder="Ej: mariscos, nueces..."
                />
              </Fld>
              <Fld label="Reaccion adversa a medicamento dental?">
                <Pills
                  value={d.s4_dental_reaccion}
                  options={YN}
                  onChange={(v) => set('s4_dental_reaccion', v)}
                />
                {d.s4_dental_reaccion === 'SI' && (
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8 }}
                    value={d.s4_dental_det}
                    onChange={(e) => set('s4_dental_det', e.target.value)}
                    placeholder="Cual fue la reaccion?"
                  />
                )}
              </Fld>
            </Col2>
          </Sec>

          {/* S5 — Revisión por Sistemas */}
          <Sec num={5} title="Revision por Sistemas">

            <SubSec title="Cardiovascular" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(
                [
                  ['s5cv_dolor', 'Dolor o presion toracica'],
                  ['s5cv_palpitaciones', 'Palpitaciones'],
                  ['s5cv_edema', 'Edema de miembros inferiores'],
                  ['s5cv_soplo', 'Soplo cardiaco diagnosticado'],
                  ['s5cv_marcapaso', 'Marcapaso / Desfibrilador'],
                  ['s5cv_infarto', 'Infarto previo'],
                ] as [string, string][]
              ).map(([k, l]) => (
                <Fld key={k} label={l}>
                  <Pills value={d[k]} options={YN} onChange={(v) => set(k, v)} />
                  {k === 's5cv_infarto' && d.s5cv_infarto === 'SI' && (
                    <input
                      className="fch-inp"
                      style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                      value={d.s5cv_infarto_cuando}
                      onChange={(e) => set('s5cv_infarto_cuando', e.target.value)}
                      placeholder="Cuando ocurrio?"
                    />
                  )}
                </Fld>
              ))}
            </div>

            <SubSec title="Respiratorio" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(
                [
                  ['s5r_disnea', 'Disnea / dificultad respiratoria'],
                  ['s5r_tos', 'Tos cronica'],
                  ['s5r_asma_act', 'Asma activo'],
                  ['s5r_ronquidos', 'Ronquidos / Apnea del sueno'],
                  ['s5r_inhalador', 'Usa inhalador?'],
                ] as [string, string][]
              ).map(([k, l]) => (
                <Fld key={k} label={l}>
                  <Pills value={d[k]} options={YN} onChange={(v) => set(k, v)} />
                  {k === 's5r_inhalador' && d.s5r_inhalador === 'SI' && (
                    <input
                      className="fch-inp"
                      style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                      value={d.s5r_inhalador_cual}
                      onChange={(e) => set('s5r_inhalador_cual', e.target.value)}
                      placeholder="Cual inhalador?"
                    />
                  )}
                </Fld>
              ))}
            </div>

            <SubSec title="Gastrointestinal" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(
                [
                  ['s5g_reflujo', 'Reflujo gastroesofagico / GERD'],
                  ['s5g_ulcera', 'Ulcera gastroduodenal'],
                  ['s5g_crohn', 'Enf. de Crohn / Colitis'],
                  ['s5g_deglucion', 'Problemas de deglucion'],
                ] as [string, string][]
              ).map(([k, l]) => (
                <Fld key={k} label={l}>
                  <Pills value={d[k]} options={YN} onChange={(v) => set(k, v)} />
                </Fld>
              ))}
            </div>

            <SubSec title="Neurologico" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(
                [
                  ['s5n_cefaleas', 'Cefaleas frecuentes'],
                  ['s5n_mareos', 'Mareos frecuentes'],
                  ['s5n_neuropatia', 'Neuropatia / Hormigueos'],
                  ['s5n_memoria', 'Dificultad de concentracion o memoria'],
                ] as [string, string][]
              ).map(([k, l]) => (
                <Fld key={k} label={l}>
                  <Pills value={d[k]} options={YN} onChange={(v) => set(k, v)} />
                </Fld>
              ))}
            </div>

            <SubSec title="Endocrino / Metabolico" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {(
                [
                  ['s5e_peso', 'Sobrepeso / bajo peso diagnosticado'],
                  ['s5e_metabolico', 'Sindrome metabolico'],
                  ['s5e_tiroides', 'Hiper / Hipotiroidismo'],
                ] as [string, string][]
              ).map(([k, l]) => (
                <Fld key={k} label={l}>
                  <Pills value={d[k]} options={YN} onChange={(v) => set(k, v)} />
                </Fld>
              ))}
            </div>

          </Sec>

          {/* S6 — Antecedentes Infecciosos */}
          <Sec num={6} title="Antecedentes Infecciosos">
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e8ecef',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 12,
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              Esta informacion es completamente confidencial y se usa unicamente para garantizar
              la seguridad del tratamiento clinico.
            </div>
            <Fld label="Ha sido diagnosticado con alguna infeccion de transmision sexual (ITS)?">
              <Pills
                value={d.s6_its}
                options={['SI', 'NO', 'PREFIERO NO RESPONDER']}
                onChange={(v) => set('s6_its', v)}
              />
            </Fld>
            {d.s6_its === 'SI' && (
              <>
                <Fld label="Seleccione las que aplican">
                  <Col3>
                    {(
                      [
                        ['s6_hep_b', 'Hepatitis B'],
                        ['s6_hep_c', 'Hepatitis C'],
                        ['s6_vih', 'VIH / SIDA'],
                        ['s6_vph', 'VPH / HPV'],
                        ['s6_sifilis', 'Sifilis'],
                        ['s6_herpes', 'Herpes genital'],
                        ['s6_gonorrea', 'Gonorrea'],
                      ] as [string, string][]
                    ).map(([k, l]) => (
                      <ChkRow key={k} label={l} checked={!!d[k]} onChange={(v) => set(k, v)} />
                    ))}
                  </Col3>
                </Fld>
                <Col2>
                  <Fld label="Otra ITS">
                    <input
                      className="fch-inp"
                      style={INPUT}
                      value={d.s6_otra}
                      onChange={(e) => set('s6_otra', e.target.value)}
                      placeholder="Especifique..."
                    />
                  </Fld>
                  <Fld label="Estado actual">
                    <Pills
                      value={d.s6_estado_its}
                      options={['En tratamiento', 'Resuelto', 'Cronico']}
                      onChange={(v) => set('s6_estado_its', v)}
                    />
                  </Fld>
                </Col2>
                <Fld label="Toma antiretrovirales u otros tratamientos relacionados?">
                  <Pills
                    value={d.s6_antiretrovirales}
                    options={YN}
                    onChange={(v) => set('s6_antiretrovirales', v)}
                  />
                </Fld>
              </>
            )}
            <Col2>
              <Fld label="Ha recibido transfusiones de sangre?">
                <Pills
                  value={d.s6_transfusion}
                  options={YN}
                  onChange={(v) => set('s6_transfusion', v)}
                />
                {d.s6_transfusion === 'SI' && (
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d.s6_transfusion_cuando}
                    onChange={(e) => set('s6_transfusion_cuando', e.target.value)}
                    placeholder="Cuando?"
                  />
                )}
              </Fld>
              <Fld label="Ha sido trasplantado?">
                <Pills
                  value={d.s6_trasplante}
                  options={YN}
                  onChange={(v) => set('s6_trasplante', v)}
                />
                {d.s6_trasplante === 'SI' && (
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d.s6_trasplante_organo}
                    onChange={(e) => set('s6_trasplante_organo', e.target.value)}
                    placeholder="Que organo?"
                  />
                )}
              </Fld>
            </Col2>
          </Sec>

          {/* S7 — Quirúrgicos */}
          <Sec num={7} title="Antecedentes Quirurgicos y Hospitalarios">
            <Col2>
              <Fld label="Ha tenido cirugias previas?">
                <Pills
                  value={d.s7_cirugias}
                  options={YN}
                  onChange={(v) => set('s7_cirugias', v)}
                />
                {d.s7_cirugias === 'SI' && (
                  <textarea
                    className="fch-inp"
                    style={{ ...TEXTAREA, marginTop: 8 }}
                    value={d.s7_cirugias_det}
                    onChange={(e) => set('s7_cirugias_det', e.target.value)}
                    placeholder="Describa las cirugias y fechas aproximadas..."
                  />
                )}
              </Fld>
              <Fld label="Hospitalizaciones en los ultimos 2 anos?">
                <Pills
                  value={d.s7_hosp}
                  options={YN}
                  onChange={(v) => set('s7_hosp', v)}
                />
                {d.s7_hosp === 'SI' && (
                  <textarea
                    className="fch-inp"
                    style={{ ...TEXTAREA, marginTop: 8 }}
                    value={d.s7_hosp_det}
                    onChange={(e) => set('s7_hosp_det', e.target.value)}
                    placeholder="Motivo y fechas..."
                  />
                )}
              </Fld>
            </Col2>
            <Col2>
              <Fld label="Tiene algun implante medico?">
                <Pills
                  value={d.s7_implante}
                  options={YN}
                  onChange={(v) => set('s7_implante', v)}
                />
              </Fld>
              <Fld label="En lista de espera para cirugia?">
                <Pills
                  value={d.s7_lista_espera}
                  options={YN}
                  onChange={(v) => set('s7_lista_espera', v)}
                />
              </Fld>
            </Col2>
          </Sec>

          {/* S8 — Gineco-Obstétrico */}
          <Sec num={8} title="Antecedentes Gineco-Obstetricos">
            <Col2>
              <Fld label="Embarazada actualmente?">
                <Pills
                  value={d.s8_embarazada}
                  options={['SI', 'NO', 'POSIBLE']}
                  onChange={(v) => set('s8_embarazada', v)}
                />
                {(d.s8_embarazada === 'SI' || d.s8_embarazada === 'POSIBLE') && (
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d.s8_semanas}
                    onChange={(e) => set('s8_semanas', e.target.value)}
                    placeholder="Semanas de gestacion..."
                  />
                )}
              </Fld>
              <Fld label="Lactando actualmente?">
                <Pills
                  value={d.s8_lactando}
                  options={YN}
                  onChange={(v) => set('s8_lactando', v)}
                />
              </Fld>
            </Col2>
            <Col2>
              <Fld label="Usa anticonceptivos orales?">
                <Pills
                  value={d.s8_anticonceptivos}
                  options={YN}
                  onChange={(v) => set('s8_anticonceptivos', v)}
                />
                {d.s8_anticonceptivos === 'SI' && (
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d.s8_anticon_cuales}
                    onChange={(e) => set('s8_anticon_cuales', e.target.value)}
                    placeholder="Cuales?"
                  />
                )}
              </Fld>
              <Fld label="Terapia hormonal de reemplazo?">
                <Pills
                  value={d.s8_terapia_h}
                  options={YN}
                  onChange={(v) => set('s8_terapia_h', v)}
                />
              </Fld>
            </Col2>
            <Col2>
              <Fld label="Fecha ultima menstruacion">
                <input
                  className="fch-inp"
                  style={INPUT}
                  type="date"
                  value={d.s8_ultima_mens}
                  onChange={(e) => set('s8_ultima_mens', e.target.value)}
                />
              </Fld>
              <Fld label="Numero de embarazos previos">
                <input
                  className="fch-inp"
                  style={INPUT}
                  type="number"
                  min="0"
                  value={d.s8_num_embarazos}
                  onChange={(e) => set('s8_num_embarazos', e.target.value)}
                  placeholder="0"
                />
              </Fld>
            </Col2>
            <Fld label="Menopausia?">
              <Pills value={d.s8_menopausia} options={YN} onChange={(v) => set('s8_menopausia', v)} />
            </Fld>
          </Sec>

          {/* S9 — Hábitos y Vida Diaria */}
          <Sec num={9} title="Habitos y Vida Diaria">
            <Fld label="Tabaco">
              <Pills
                value={d.s9_tabaco}
                options={['NUNCA', 'EX-FUMADOR', 'OCASIONAL', 'DIARIO']}
                onChange={(v) => set('s9_tabaco', v)}
              />
              {(d.s9_tabaco === 'DIARIO' || d.s9_tabaco === 'OCASIONAL') && (
                <Col2>
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d.s9_tab_cantidad}
                    onChange={(e) => set('s9_tab_cantidad', e.target.value)}
                    placeholder="Cantidad por dia..."
                  />
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d.s9_tab_anios}
                    onChange={(e) => set('s9_tab_anios', e.target.value)}
                    placeholder="Anos fumando..."
                  />
                </Col2>
              )}
            </Fld>
            <Fld label="Alcohol">
              <Pills
                value={d.s9_alcohol}
                options={['NUNCA', 'SOCIAL', 'MODERADO', 'FRECUENTE', 'DEPENDENCIA']}
                onChange={(v) => set('s9_alcohol', v)}
              />
              {d.s9_alcohol !== 'NUNCA' && d.s9_alcohol !== '' && (
                <input
                  className="fch-inp"
                  style={{ ...INPUT, marginTop: 8, fontSize: 12, maxWidth: 260 }}
                  value={d.s9_alc_bebidas}
                  onChange={(e) => set('s9_alc_bebidas', e.target.value)}
                  placeholder="Bebidas por semana..."
                />
              )}
            </Fld>
            <Fld label="Sustancias psicoactivas">
              <Pills
                value={d.s9_drogas}
                options={['NUNCA', 'OCASIONAL', 'FRECUENTE']}
                onChange={(v) => set('s9_drogas', v)}
              />
              {(d.s9_drogas === 'OCASIONAL' || d.s9_drogas === 'FRECUENTE') && (
                <input
                  className="fch-inp"
                  style={{ ...INPUT, marginTop: 8, fontSize: 12, maxWidth: 320 }}
                  value={d.s9_drogas_cuales}
                  onChange={(e) => set('s9_drogas_cuales', e.target.value)}
                  placeholder="Cuales? (opcional)"
                />
              )}
            </Fld>
            <Col2>
              <Fld label="Ejercicio fisico">
                <Pills
                  value={d.s9_ejercicio}
                  options={['SEDENTARIO', '1-2x/sem', '3-4x/sem', 'DIARIO']}
                  onChange={(v) => set('s9_ejercicio', v)}
                />
                {d.s9_ejercicio && d.s9_ejercicio !== 'SEDENTARIO' && (
                  <input
                    className="fch-inp"
                    style={{ ...INPUT, marginTop: 8, fontSize: 12 }}
                    value={d.s9_ejercicio_tipo}
                    onChange={(e) => set('s9_ejercicio_tipo', e.target.value)}
                    placeholder="Tipo de actividad..."
                  />
                )}
              </Fld>
              <Fld label="Alimentacion">
                <Pills
                  value={d.s9_alimentacion}
                  options={['MUY SALUDABLE', 'REGULAR', 'POCO SALUDABLE']}
                  onChange={(v) => set('s9_alimentacion', v)}
                />
              </Fld>
            </Col2>
            <Col2>
              <Fld label="Horas de sueno promedio">
                <select
                  className="fch-inp"
                  style={INPUT}
                  value={d.s9_sueno}
                  onChange={(e) => set('s9_sueno', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="menos5">Menos de 5 horas</option>
                  <option value="5a6">5 a 6 horas</option>
                  <option value="7a8">7 a 8 horas</option>
                  <option value="mas9">Mas de 9 horas</option>
                </select>
              </Fld>
              <Fld label="Ocupacion / Profesion">
                <input
                  className="fch-inp"
                  style={INPUT}
                  value={d.s9_ocupacion}
                  onChange={(e) => set('s9_ocupacion', e.target.value)}
                  placeholder="Ej: ingeniero, docente..."
                />
              </Fld>
            </Col2>
            <Col2>
              <Fld label="Nivel de estres percibido (0 = ninguno, 10 = extremo)">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={d.s9_estres}
                    onChange={(e) => set('s9_estres', e.target.value)}
                    style={{ flex: 1, accentColor: BLUE }}
                  />
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: BLUE,
                      minWidth: 28,
                      textAlign: 'center',
                    }}
                  >
                    {d.s9_estres}
                  </span>
                </div>
              </Fld>
              <Fld label="Exposicion ocupacional a quimicos / radiacion?">
                <Pills
                  value={d.s9_exposicion}
                  options={YN}
                  onChange={(v) => set('s9_exposicion', v)}
                />
              </Fld>
            </Col2>
          </Sec>

          {/* S10 — Familiares */}
          <Sec num={10} title="Antecedentes Familiares">
            <Fld label="Enfermedades presentes en familiares directos">
              <Col3>
                {(
                  [
                    ['s10_diab', 'Diabetes'],
                    ['s10_hiper', 'Hipertension'],
                    ['s10_cancer_oral', 'Cancer oral'],
                    ['s10_cancer_otro', 'Cancer (otro tipo)'],
                    ['s10_cardiaco', 'Cardiopatia'],
                    ['s10_renal', 'Enf. Renal'],
                    ['s10_mental', 'Enf. Mental'],
                    ['s10_malocusion', 'Maloclusion / Ortodoncia'],
                    ['s10_periodontal', 'Enf. Periodontal'],
                  ] as [string, string][]
                ).map(([k, l]) => (
                  <ChkRow key={k} label={l} checked={!!d[k]} onChange={(v) => set(k, v)} />
                ))}
              </Col3>
            </Fld>
            <Fld label="Detalle familiar">
              <textarea
                className="fch-inp"
                style={TEXTAREA}
                value={d.s10_detalle}
                onChange={(e) => set('s10_detalle', e.target.value)}
                placeholder="Ej: padre diabetico, madre hipertensa..."
              />
            </Fld>
          </Sec>

          {/* S11 — Odontológicos */}
          <Sec num={11} title="Antecedentes Odontologicos">
            <Fld label="Ultima visita al dentista">
              <select
                className="fch-inp"
                style={{ ...INPUT, maxWidth: 280 }}
                value={d.s11_ultima_visita}
                onChange={(e) => set('s11_ultima_visita', e.target.value)}
              >
                <option value="">Seleccionar...</option>
                <option value="menos6m">Hace menos de 6 meses</option>
                <option value="6a12m">6 a 12 meses</option>
                <option value="1a2a">1 a 2 anos</option>
                <option value="2a5a">2 a 5 anos</option>
                <option value="mas5a">Mas de 5 anos</option>
                <option value="nunca">Nunca</option>
              </select>
            </Fld>
            <Fld label="Tratamientos odontologicos previos">
              <Col3>
                {(
                  [
                    ['s11_caries', 'Caries / Resinas'],
                    ['s11_extrac', 'Extracciones'],
                    ['s11_endodoncia', 'Endodoncia'],
                    ['s11_ortodoncia', 'Ortodoncia'],
                    ['s11_implantes', 'Implantes'],
                    ['s11_protesis_prev', 'Protesis'],
                    ['s11_cirugia', 'Cirugia oral'],
                    ['s11_blanq', 'Blanqueamiento'],
                    ['s11_perio', 'Periodoncia'],
                  ] as [string, string][]
                ).map(([k, l]) => (
                  <ChkRow key={k} label={l} checked={!!d[k]} onChange={(v) => set(k, v)} />
                ))}
              </Col3>
            </Fld>
            <Col2>
              <Fld label="Experiencia previa con el dentista">
                <Pills
                  value={d.s11_experiencia}
                  options={['Muy positiva', 'Normal', 'Negativa', 'Traumatica']}
                  onChange={(v) => set('s11_experiencia', v)}
                />
              </Fld>
              <Fld label="Miedo o ansiedad al dentista?">
                <Pills
                  value={d.s11_ansiedad}
                  options={['SI', 'NO', 'MUCHO']}
                  onChange={(v) => set('s11_ansiedad', v)}
                />
                {(d.s11_ansiedad === 'SI' || d.s11_ansiedad === 'MUCHO') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={d.s11_ansiedad_nivel}
                      onChange={(e) => set('s11_ansiedad_nivel', e.target.value)}
                      style={{ flex: 1, accentColor: BLUE }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 800, color: BLUE, minWidth: 22, textAlign: 'center' }}>
                      {d.s11_ansiedad_nivel}
                    </span>
                  </div>
                )}
              </Fld>
            </Col2>
            <Col2>
              <Fld label="Usa protesis actualmente?">
                <Pills value={d.s11_protesis_activa} options={YN} onChange={(v) => set('s11_protesis_activa', v)} />
              </Fld>
              <Fld label="Ortodoncia activa?">
                <Pills value={d.s11_ortodoncia_activa} options={YN} onChange={(v) => set('s11_ortodoncia_activa', v)} />
              </Fld>
            </Col2>
            <Col2>
              <Fld label="Sangrado de encias?">
                <Pills
                  value={d.s11_sangrado}
                  options={['NUNCA', 'A VECES', 'FRECUENTE', 'SIEMPRE']}
                  onChange={(v) => set('s11_sangrado', v)}
                />
              </Fld>
              <Fld label="Bruxismo diagnosticado o sospechado?">
                <Pills
                  value={d.s11_bruxismo}
                  options={['SI', 'NO', 'SOSPECHO']}
                  onChange={(v) => set('s11_bruxismo', v)}
                />
              </Fld>
            </Col2>
            {(d.s11_bruxismo === 'SI' || d.s11_bruxismo === 'SOSPECHO') && (
              <Fld label="Usa protector nocturno?">
                <Pills value={d.s11_protector} options={YN} onChange={(v) => set('s11_protector', v)} />
              </Fld>
            )}

            <SubSec title="Higiene Oral" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <Fld label="Frecuencia de cepillado al dia">
                <select
                  className="fch-inp"
                  style={INPUT}
                  value={d.s11_cepillado}
                  onChange={(e) => set('s11_cepillado', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="1">1 vez</option>
                  <option value="2">2 veces</option>
                  <option value="3">3 veces</option>
                  <option value="mas3">Mas de 3 veces</option>
                </select>
              </Fld>
              <Fld label="Tipo de cepillo">
                <select
                  className="fch-inp"
                  style={INPUT}
                  value={d.s11_cepillo}
                  onChange={(e) => set('s11_cepillo', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="suave">Suave</option>
                  <option value="medio">Medio</option>
                  <option value="duro">Duro</option>
                  <option value="electrico">Electrico</option>
                </select>
              </Fld>
              <Fld label="Usa hilo dental?">
                <Pills value={d.s11_hilo} options={['SIEMPRE', 'A VECES', 'NUNCA']} onChange={(v) => set('s11_hilo', v)} />
              </Fld>
              <Fld label="Usa enjuague bucal?">
                <Pills value={d.s11_enjuague} options={['SIEMPRE', 'A VECES', 'NUNCA']} onChange={(v) => set('s11_enjuague', v)} />
              </Fld>
            </div>
          </Sec>

          {/* S12 — Observaciones */}
          <Sec num={12} title="Observaciones del Profesional">
            <Fld label="Observaciones clinicas">
              <textarea
                className="fch-inp"
                style={{ ...TEXTAREA, minHeight: 100 }}
                value={d.s12_obs}
                onChange={(e) => set('s12_obs', e.target.value)}
                placeholder="Notas del medico / odontologo..."
              />
            </Fld>
            <Col2>
              <Fld label="Historia llenada por">
                <Pills
                  value={d.s12_llenado_paciente}
                  options={['El paciente', 'El profesional', 'Ambos']}
                  onChange={(v) => set('s12_llenado_paciente', v)}
                />
              </Fld>
              <Fld label="Fecha de registro">
                <input
                  className="fch-inp"
                  style={INPUT}
                  type="date"
                  value={d.s12_fecha}
                  onChange={(e) => set('s12_fecha', e.target.value)}
                />
              </Fld>
            </Col2>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 13,
                color: '#334155',
                cursor: 'pointer',
                userSelect: 'none',
                marginTop: 8,
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={d.s12_firma}
                onChange={(e) => set('s12_firma', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: BLUE, cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
              />
              <span>
                <strong>Confirmacion:</strong> el paciente confirma que la informacion
                proporcionada es verídica y autoriza su uso para fines clinicos.
              </span>
            </label>
          </Sec>

        </div>
        {/* ── FOOTER ── */}
        <div
          style={{
            flexShrink: 0,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 -4px 16px rgba(0,0,0,.06)',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  padding: '9px 18px',
                  background: '#fff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Volver
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading}
              style={{
                padding: '9px 18px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Omitir por ahora
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={loading}
            style={{
              padding: '10px 28px',
              background: loading ? '#94a3b8' : BLUE,
              border: 'none',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(41,178,232,.3)',
              transition: 'all .15s',
            }}
          >
            {loading ? 'Guardando...' : saveLabel}
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div
          style={{
            position: 'fixed',
            bottom: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            background: msg.type === 'success' ? '#16a34a' : '#ef4444',
            color: '#fff',
            padding: '11px 24px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,.18)',
            whiteSpace: 'nowrap',
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {msg.text}
        </div>
      )}
    </>
  );
};
