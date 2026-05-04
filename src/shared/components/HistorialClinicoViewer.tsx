import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  ConsultationKind,
  WorkflowConsultation,
  buildVisitSummary,
} from '../lib/clinicalWorkflow';

interface HistorialClinicoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  consultations: WorkflowConsultation[];
}

const badgePalette = (kind: ConsultationKind) => {
  if (kind === 'ORTODONCIA') {
    return {
      bg: 'rgba(245, 243, 255, 0.95)',
      fg: '#6d28d9',
      border: 'rgba(196, 181, 253, 0.9)',
      dot: '#8b5cf6',
    };
  }

  return {
    bg: 'rgba(224, 242, 254, 0.95)',
    fg: '#075985',
    border: 'rgba(125, 211, 252, 0.9)',
    dot: '#0ea5e9',
  };
};

export const HistorialClinicoViewer = ({
  isOpen,
  onClose,
  patientName,
  consultations,
}: HistorialClinicoViewerProps) => {
  const visits = useMemo(
    () => consultations.map(buildVisitSummary),
    [consultations]
  );
  const latest = visits[0] || null;
  const [selectedId, setSelectedId] = useState<string>('');
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId((current) => current || visits[0]?.id || '');
    setCompareMode(false);
  }, [isOpen, visits]);

  const selectedVisit = visits.find((visit) => visit.id === selectedId) || visits[0] || null;

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .hcv, .hcv * { box-sizing: border-box; }
        .hcv {
          position: fixed;
          inset: 0;
          z-index: 12000;
          background: rgba(15, 23, 42, 0.42);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .hcv-shell {
          width: min(1380px, 100%);
          height: min(880px, calc(100vh - 48px));
          border-radius: 28px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 340px minmax(0, 1fr);
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,249,252,0.98));
          border: 1px solid rgba(226,232,240,0.95);
          box-shadow: 0 30px 80px rgba(15,23,42,0.22);
        }
        .hcv-side {
          background: linear-gradient(180deg, #f8fafc, #eff4f8);
          border-right: 1px solid rgba(226,232,240,0.95);
          display: grid;
          grid-template-rows: auto 1fr;
          min-height: 0;
        }
        .hcv-main {
          display: grid;
          grid-template-rows: auto 1fr;
          min-height: 0;
        }
        .hcv-head {
          padding: 22px 24px;
          border-bottom: 1px solid rgba(226,232,240,0.9);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .hcv-kicker {
          margin: 0 0 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #94a3b8;
        }
        .hcv-title {
          margin: 0;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -.04em;
          color: #0f172a;
        }
        .hcv-copy {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: #64748b;
        }
        .hcv-close,
        .hcv-compare {
          border: 1px solid rgba(226,232,240,0.95);
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #334155;
          border-radius: 14px;
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .hcv-timeline {
          overflow: auto;
          padding: 18px;
          display: grid;
          gap: 12px;
          align-content: start;
        }
        .hcv-node {
          width: 100%;
          text-align: left;
          border: 1px solid rgba(226,232,240,0.95);
          background: rgba(255,255,255,0.9);
          border-radius: 18px;
          padding: 14px;
          cursor: pointer;
          display: grid;
          gap: 8px;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .hcv-node:hover,
        .hcv-node.active {
          transform: translateY(-1px);
          box-shadow: 0 16px 32px rgba(148,163,184,0.18);
          border-color: rgba(125,211,252,0.95);
        }
        .hcv-node-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .hcv-node-date {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
        }
        .hcv-node-motive {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          line-height: 1.55;
        }
        .hcv-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          border: 1px solid transparent;
        }
        .hcv-badge::before {
          content: '';
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: currentColor;
          opacity: .85;
        }
        .hcv-detail {
          overflow: auto;
          padding: 24px;
          display: grid;
          gap: 18px;
          align-content: start;
          animation: hcvFade .22s ease;
        }
        .hcv-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .hcv-card {
          border-radius: 24px;
          border: 1px solid rgba(226,232,240,0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          box-shadow: 0 16px 38px rgba(148,163,184,0.12);
          overflow: hidden;
        }
        .hcv-card-head {
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(226,232,240,0.9);
        }
        .hcv-card-title {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }
        .hcv-card-body {
          padding: 18px;
        }
        .hcv-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .hcv-meta-chip {
          padding: 8px 10px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }
        .hcv-note {
          padding: 16px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(224,242,254,0.52), rgba(240,249,255,0.65));
          border: 1px solid rgba(186,230,253,0.95);
          font-size: 13px;
          line-height: 1.75;
          color: #0f172a;
          white-space: pre-wrap;
        }
        .hcv-teeth {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .hcv-tooth {
          min-width: 44px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(226,232,240,0.95);
          background: #f8fafc;
          font-size: 12px;
          font-weight: 800;
          color: #334155;
          text-align: center;
        }
        .hcv-table {
          width: 100%;
          border-collapse: collapse;
        }
        .hcv-table th,
        .hcv-table td {
          padding: 12px 0;
          text-align: left;
          border-bottom: 1px solid rgba(226,232,240,0.92);
          font-size: 12.5px;
        }
        .hcv-table th {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #94a3b8;
        }
        .hcv-table td { color: #334155; }
        .hcv-empty {
          padding: 24px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          font-size: 13px;
          color: #64748b;
        }
        @keyframes hcvFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 980px) {
          .hcv-shell { grid-template-columns: 1fr; height: auto; max-height: calc(100vh - 32px); }
          .hcv-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="hcv" onClick={onClose}>
        <div className="hcv-shell" onClick={(event) => event.stopPropagation()}>
          <aside className="hcv-side">
            <div className="hcv-head">
              <div>
                <p className="hcv-kicker">Linea de tiempo clinica</p>
                <h2 className="hcv-title">{patientName}</h2>
                <p className="hcv-copy">Cada visita queda congelada como evidencia clinica y operativa.</p>
              </div>
            </div>

            <div className="hcv-timeline">
              {visits.length ? visits.map((visit) => {
                const palette = badgePalette(visit.type);
                return (
                  <button
                    key={visit.id}
                    className={`hcv-node ${selectedVisit?.id === visit.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(visit.id)}
                  >
                    <div className="hcv-node-top">
                      <span className="hcv-node-date">{visit.dateLabel}</span>
                      <span
                        className="hcv-badge"
                        style={{ background: palette.bg, color: palette.fg, borderColor: palette.border }}
                      >
                        {visit.type}
                      </span>
                    </div>
                    <div className="hcv-node-motive">{visit.motive}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{visit.code}</div>
                  </button>
                );
              }) : (
                <div className="hcv-empty">No hay consultas guardadas para este paciente.</div>
              )}
            </div>
          </aside>

          <section className="hcv-main">
            <div className="hcv-head">
              <div>
                <p className="hcv-kicker">Detalle de visita</p>
                <h3 className="hcv-title" style={{ fontSize: 22 }}>
                  {selectedVisit ? selectedVisit.motive : 'Sin visita seleccionada'}
                </h3>
                <p className="hcv-copy">
                  {selectedVisit ? `${selectedVisit.dateLabel} · ${selectedVisit.doctor}` : 'Selecciona una visita del timeline.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {selectedVisit && latest && latest.id !== selectedVisit.id && (
                  <button className="hcv-compare" onClick={() => setCompareMode((current) => !current)}>
                    <ArrowRightLeft size={15} />
                    {compareMode ? 'Cerrar comparativa' : 'Comparar con actual'}
                  </button>
                )}
                <button className="hcv-close" onClick={onClose}>
                  <X size={15} /> Cerrar
                </button>
              </div>
            </div>

            <div className="hcv-detail">
              {!selectedVisit ? (
                <div className="hcv-empty">Selecciona una visita del timeline para revisar el snapshot clinico.</div>
              ) : compareMode && latest ? (
                <div className="hcv-grid">
                  {[selectedVisit, latest].map((visit, index) => {
                    const palette = badgePalette(visit.type);
                    return (
                      <article key={`${visit.id}-${index}`} className="hcv-card">
                        <div className="hcv-card-head">
                          <div className="hcv-card-title">
                            <CalendarDays size={16} />
                            {index === 0 ? 'Snapshot historico' : 'Estado mas reciente'}
                          </div>
                          <span className="hcv-badge" style={{ background: palette.bg, color: palette.fg, borderColor: palette.border }}>
                            {visit.type}
                          </span>
                        </div>
                        <div className="hcv-card-body" style={{ display: 'grid', gap: 16 }}>
                          <div className="hcv-meta">
                            <span className="hcv-meta-chip">{visit.dateLabel}</span>
                            <span className="hcv-meta-chip">{visit.code}</span>
                            <span className="hcv-meta-chip">{visit.doctor}</span>
                          </div>
                          <div className="hcv-note">{visit.note || 'Sin narrativa clinica guardada.'}</div>
                          <div className="hcv-teeth">
                            {(visit.touchedTeeth.length ? visit.touchedTeeth : ['Sin piezas'])
                              .map((tooth) => <span key={tooth} className="hcv-tooth">{tooth}</span>)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <>
                  <article className="hcv-card">
                    <div className="hcv-card-head">
                      <div className="hcv-card-title">
                        <Stethoscope size={16} /> Snapshot de la visita
                      </div>
                      <span className="hcv-meta-chip">{selectedVisit.code}</span>
                    </div>
                    <div className="hcv-card-body" style={{ display: 'grid', gap: 16 }}>
                      <div className="hcv-meta">
                        <span className="hcv-meta-chip">{selectedVisit.dateLabel}</span>
                        <span className="hcv-meta-chip">{selectedVisit.doctor}</span>
                        <span className="hcv-meta-chip">{selectedVisit.type}</span>
                      </div>
                      <div className="hcv-note">{selectedVisit.note || 'Sin evolucion narrativa guardada en esta visita.'}</div>
                    </div>
                  </article>

                  <div className="hcv-grid">
                    <article className="hcv-card">
                      <div className="hcv-card-head">
                        <div className="hcv-card-title">
                          <ClipboardList size={16} /> Piezas tocadas
                        </div>
                      </div>
                      <div className="hcv-card-body">
                        <div className="hcv-teeth">
                          {(selectedVisit.touchedTeeth.length ? selectedVisit.touchedTeeth : ['Sin piezas registradas'])
                            .map((tooth) => <span key={tooth} className="hcv-tooth">{tooth}</span>)}
                        </div>
                      </div>
                    </article>

                    <article className="hcv-card">
                      <div className="hcv-card-head">
                        <div className="hcv-card-title">
                          <FileText size={16} /> Procedimientos
                        </div>
                      </div>
                      <div className="hcv-card-body">
                        {selectedVisit.procedures.length ? (
                          <table className="hcv-table">
                            <thead>
                              <tr>
                                <th>Procedimiento</th>
                                <th>Pieza</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedVisit.procedures.map((procedure) => (
                                <tr key={procedure.id}>
                                  <td>{procedure.nombre}</td>
                                  <td>{procedure.pieza || procedure.accesorio || 'Sin dato'}</td>
                                  <td>{procedure.estado}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="hcv-empty">No hay procedimientos estructurados para esta visita.</div>
                        )}
                      </div>
                    </article>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
