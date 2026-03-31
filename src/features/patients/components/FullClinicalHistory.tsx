import React, { useState, useEffect } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { usePatient } from '../../../core/context/PatientContext';

export const FullClinicalHistory = ({ patientId, initialData, onSave, onComplete, onBack, saveLabel = 'Finalizar Registro' }: any) => {
  const { loadPatientById } = usePatient();
  const [loading, setLoading] = useState(false);

  const defaultHistory = {
    habitos: {
      fuma: 'no',
      alcohol: 'no',
      deportes: '',
      sueno: 'bueno',
      estres: 'medio',
      higiene_frecuencia: '2'
    },
    sistemico: {
      diabetes: 'no',
      hipertension: 'no',
      cardiopatias: 'no',
      problemas_renales: 'no',
      hepatitis: 'no',
      tiroides: 'no',
      otros_sistemas: '',
      cardiopatia: false,
      asma: false,
      cancer: false,
      diabetes_cond: false,
      hipertension_cond: false,
      renales: false,
      hepaticas: false,
      alergias_gen: false,
      vih: false
    },
    especial: {
      embarazada: 'no',
      anticonceptivos_orales: 'no',
      medicamentos: 'no',
      medicamentos_detalle: '',
      tabaco: 'no',
      tabaco_detalle: '',
      sustancias_controladas: 'no',
      sustancias_detalle: '',
      alergias: 'no',
      alergias_detalle: '',
      cirugias_recientes: 'no',
      hospitalizaciones: 'no',
      embarazo: 'no',
      meses_embarazo: '',
      medicacion_actual: ''
    },
    odontologico: {
      ultima_visita: '',
      motivo_consulta: '',
      experiencia_previa: 'buena',
      sangrado_encias: 'no',
      bruxismo: 'no',
      diagnostico_inicial: '',
      plan_tratamiento: ''
    },
    observaciones_finales: ''
  };

  const [clinicalHistory, setClinicalHistory] = useState<any>(defaultHistory);

  useEffect(() => {
    if (initialData) {
      setClinicalHistory((prev: any) => ({
        habitos: { ...defaultHistory.habitos, ...initialData.habitos },
        sistemico: { ...defaultHistory.sistemico, ...initialData.sistemico },
        especial: { ...defaultHistory.especial, ...initialData.especial },
        odontologico: { ...defaultHistory.odontologico, ...initialData.odontologico, motivo_consulta: initialData.motivo || initialData.motivo_consulta || defaultHistory.odontologico.motivo_consulta },
        observaciones_finales: initialData.observaciones_finales || defaultHistory.observaciones_finales
      }));
    } else {
      setClinicalHistory(defaultHistory);
    }
  }, [initialData]);

  const handleClinicalChange = (section: string, field: string, value: any) => {
    setClinicalHistory((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleFinalSave = async (isSkipping = false) => {
    try {
      setLoading(true);
      
      const payload = isSkipping 
        ? { clinical_history: { estado: 'omitido', fecha: new Date() }, historia_completa: false }
        : { 
            clinical_history: clinicalHistory, 
            historia_completa: true 
          };

      const { error } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', patientId);

      if (error) throw error;

      await loadPatientById(patientId);
      alert(isSkipping ? "Registro saltado" : "Historia Clínica guardada");
      if (onSave) onSave(clinicalHistory);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Error al procesar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clinical-container">
      <style>{`
        .clinical-container { font-family: 'Inter', system-ui, sans-serif; background: #f5f8ff; padding: 40px; }
        .clinical-card { background: white; border-radius: 22px; box-shadow: 0 28px 70px rgba(15, 23, 42, 0.09); max-width: 1000px; margin: 0 auto; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.18); }
        .clinical-header { padding: 24px 30px; border-bottom: 1px solid #e7ecf2; display: flex; justify-content: space-between; align-items: center; }
        .btn-skip { background: #f4f7fb; color: #4f5d6a; border: 1px solid #d8e2ec; padding: 9px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .btn-skip:hover { background: #edf2f7; }
        .btn-save { background: #0f6eed; color: white; border: none; padding: 10px 24px; border-radius: 10px; cursor: pointer; font-weight: 700; transition: transform 0.2s; }
        .btn-save:hover { transform: translateY(-1px); }
        
        .form-section { padding: 28px 30px; border-bottom: 1px solid #eaf1f7; }
        .clinical-footer {
          position: sticky;
          bottom: 0;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(18px);
          border-top: 1px solid rgba(148,163,184,0.22);
          box-shadow: 0 -18px 40px rgba(15,23,42,0.08);
          padding: 22px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          z-index: 12;
        }
        .clinical-footer .btn-skip { min-width: 140px; }
        .clinical-footer .btn-save { min-width: 180px; }
        .btn-back {
          background: #f5f7fb;
          color: #475569;
          border: 1px solid #d8e2ec;
          padding: 10px 22px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          transition: background .18s ease;
        }
        .btn-back:hover { background: #eef2f7; }
        .section-title { font-size: 17px; font-weight: 700; color: #113358; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .section-title span { background: #0f6eed; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        
        .input-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .input-group { display: flex; flex-direction: column; gap: 9px; }
        .input-group label { font-size: 14px; font-weight: 600; color: #324a5f; }
        .input-group select, .input-group input, .input-group textarea { 
          padding: 12px 14px; border: 1px solid #c8d6e5; border-radius: 11px; outline: none; transition: all 0.18s ease-in-out; background: #fff;
        }
        .input-group select:focus, .input-group input:focus, .input-group textarea:focus { border-color: #0f6eed; box-shadow: 0 0 0 3px rgba(15, 110, 237, 0.12); }
        
        .full-width { grid-column: span 2; }
        `}</style>

      <div className="clinical-card">
        <header className="clinical-header">
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
              <div style={{width:36,height:36,display:'grid',placeItems:'center',borderRadius:14,background:'#eff6ff',color:'#2563eb',fontSize:18}}>🦷</div>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.24em',color:'#2563eb'}}>EstDent</div>
                <h2 style={{margin:'6px 0 0',fontSize:24,fontWeight:800,color:'#0f172a'}}>Ficha Clínica</h2>
              </div>
            </div>
            <p style={{color: '#64748b', margin: '5px 0 0 0'}}>Paciente ID: {patientId}</p>
          </div>
          </header>

        {/* SESIÓN 1: ESTILO DE VIDA */}
        <div className="form-section">
          <div className="section-title"><span>1</span> Vida Privada y Hábitos</div>
          <div className="input-grid">
            <div className="input-group">
              <label>¿Consume tabaco?</label>
              <select value={clinicalHistory.habitos.fuma} onChange={e => handleClinicalChange('habitos', 'fuma', e.target.value)}>
                <option value="no">No</option>
                <option value="si">Sí, ocasional</option>
                <option value="frecuente">Sí, frecuente</option>
              </select>
            </div>
            <div className="input-group">
              <label>Nivel de Estrés Diario</label>
              <select value={clinicalHistory.habitos.estres} onChange={e => handleClinicalChange('habitos', 'estres', e.target.value)}>
                <option value="bajo">Bajo</option>
                <option value="medio">Moderado</option>
                <option value="alto">Muy Alto</option>
              </select>
            </div>
            <div className="input-group full-width">
              <label>¿Realiza deportes o actividades físicas? (Mencione cuáles)</label>
              <input type="text" value={clinicalHistory.habitos.deportes} onChange={e => handleClinicalChange('habitos', 'deportes', e.target.value)} />
            </div>
          </div>
        </div>

        {/* SESIÓN 2: SALUD SISTÉMICA */}
        <div className="form-section">
          <div className="section-title"><span>2</span> Antecedentes Sistémicos</div>
          <div className="input-grid">
            <div className="input-group">
              <label>Diabetes</label>
              <select value={clinicalHistory.sistemico.diabetes} onChange={e => handleClinicalChange('sistemico', 'diabetes', e.target.value)}>
                <option value="no">No</option>
                <option value="tipo1">Tipo 1</option>
                <option value="tipo2">Tipo 2</option>
                <option value="controlada">Controlada</option>
              </select>
            </div>
            <div className="input-group">
              <label>Hipertensión</label>
              <select value={clinicalHistory.sistemico.hipertension} onChange={e => handleClinicalChange('sistemico', 'hipertension', e.target.value)}>
                <option value="no">No</option>
                <option value="si">Sí</option>
                <option value="medicada">Sí, bajo medicación</option>
              </select>
            </div>
            <div className="input-group full-width">
              <label>Otras enfermedades o condiciones médicas importantes</label>
              <textarea 
                value={clinicalHistory.sistemico.otros_sistemas} 
                onChange={e => handleClinicalChange('sistemico', 'otros_sistemas', e.target.value)}
                placeholder="Ej: Problemas tiroideos, renales, cardiacos..."
              />
            </div>
          </div>

          <div className="section-title" style={{marginTop:16}}><span>2.1</span> Condiciones Médicas (marcar las presentes)</div>
          <div className="input-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>
            {['Cardiopatía','Asma','Cáncer','Diabetes','Hipertensión','Renales','Hepáticas','Alergias','VIH'].map(cond=> (
              <label key={cond} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#334155'}}>
                <input type="checkbox" checked={clinicalHistory.sistemico[cond.toLowerCase()]||false} onChange={e=>handleClinicalChange('sistemico', cond.toLowerCase(), e.target.checked)} /> {cond}
              </label>
            ))}
          </div>
        </div>

        {/* SESIÓN 3: HISTORIA ODONTOLÓGICA */}
        <div className="form-section">
          <div className="section-title"><span>3</span> Historia Dental</div>
          <div className="input-grid">
            <div className="input-group">
              <label>Motivo principal de su visita</label>
              <input type="text" placeholder="Ej: Dolor, estética, limpieza..." value={clinicalHistory.odontologico.motivo_consulta} onChange={e => handleClinicalChange('odontologico', 'motivo_consulta', e.target.value)} />
            </div>
            <div className="input-group">
              <label>¿Le sangran las encías al cepillarse?</label>
              <select value={clinicalHistory.odontologico.sangrado_encias} onChange={e => handleClinicalChange('odontologico', 'sangrado_encias', e.target.value)}>
                <option value="no">Nunca</option>
                <option value="aveces">A veces</option>
                <option value="si">Siempre</option>
              </select>
            </div>
          </div>
        </div>

        {/* SESIÓN / OBSERVACIONES */}
        <div className="form-section">
          <div className="section-title"><span>4</span> Sesión Clínica e Historia (Notas)</div>
          <div className="input-grid">
            <div className="input-group full-width">
              <label>Diagnóstico inicial</label>
              <textarea
                value={clinicalHistory.odontologico.diagnostico_inicial}
                onChange={e => handleClinicalChange('odontologico', 'diagnostico_inicial', e.target.value)}
                placeholder="Describe hallazgos, estado bucal y primeros impresiones..."
              />
            </div>
            <div className="input-group full-width">
              <label>Plan de tratamiento propuesto</label>
              <textarea
                value={clinicalHistory.odontologico.plan_tratamiento}
                onChange={e => handleClinicalChange('odontologico', 'plan_tratamiento', e.target.value)}
                placeholder="Ej: profilaxis + caries + endodoncia TODO, etc..."
              />
            </div>
            <div className="input-group full-width">
              <label>Observaciones finales de la historia clínica</label>
              <textarea
                value={clinicalHistory.observaciones_finales}
                onChange={e => setClinicalHistory((prev: any) => ({ ...prev, observaciones_finales: e.target.value }))}
                placeholder="Notas complementarias, señales de seguimiento, recordatorios..."
              />
            </div>
          </div>
        </div>
      </div>
      <footer className="clinical-footer">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {onBack && (
            <button type="button" className="btn-back" onClick={onBack}>Volver</button>
          )}
          <button type="button" className="btn-skip" onClick={() => handleFinalSave(true)}>Omitir por ahora</button>
        </div>
        <button type="button" className="btn-save" onClick={() => handleFinalSave(false)} disabled={loading} style={{boxShadow:'0 18px 40px rgba(34, 102, 255, 0.2)'}}>
          {loading ? 'Guardando...' : saveLabel}
        </button>
      </footer>
    </div>
  );
};