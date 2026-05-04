import { useMemo, useState } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { resolveConsultationCode } from '../../../shared/lib/consultationUtils';
import { Files, FileImage, ShieldCheck, Upload, Trash2, X, FolderOpen, Calendar, CheckCircle2 } from 'lucide-react';

interface RadiologiaOrden {
  id: string;
  tipo: string;
  motivo: string;
  justificacion_automatica: string;
  piezas_solicitadas?: string[];
  consentimiento_texto?: string;
  consentimiento_aceptado?: boolean;
  consentimiento_aceptado_at?: string;
  firma_digital_base64?: string;
  firma_digital_timestamp?: string;
  imagen_subida_url?: string;
  estado: 'pendiente' | 'realizado' | 'archivado';
  creado_en: string;
  paciente_id: string;
  consulta_id?: string;
}

interface ConsultationRecord {
  id: string;
  created_at?: string;
  fecha?: string;
  codigo_consulta?: string;
  detalles_clinicos?: Record<string, any>;
}

interface AggregatedOrder {
  order: RadiologiaOrden;
  consultationId: string;
  consultationCode: string;
  consultationDate?: string;
}

interface PatientDigitalFileHubProps {
  isOpen: boolean;
  patientId: string;
  patientName: string;
  consultations: ConsultationRecord[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #d7dee8',
  borderRadius: 14,
  background: '#ffffff',
  boxShadow: '0 4px 14px rgba(15,23,42,.06)',
};

const getOrderDate = (order: RadiologiaOrden, fallback?: string) => order.creado_en || fallback || '';

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado'));
    reader.readAsDataURL(file);
  });

export const PatientDigitalFileHub = ({
  isOpen,
  patientId,
  patientName,
  consultations,
  onClose,
  onRefresh,
}: PatientDigitalFileHubProps) => {
  const [activeTab, setActiveTab] = useState<'rx' | 'legal'>('rx');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const orders = useMemo<AggregatedOrder[]>(() => {
    const all: AggregatedOrder[] = [];
    consultations.forEach((consultation) => {
      const details = consultation.detalles_clinicos || {};
      const list: RadiologiaOrden[] = Array.isArray(details.ordenes_radiologia) ? details.ordenes_radiologia : [];
      const code = resolveConsultationCode(consultation as any);
      list.forEach((order) => {
        all.push({
          order,
          consultationId: consultation.id,
          consultationCode: code,
          consultationDate: consultation.fecha || consultation.created_at,
        });
      });
    });

    return all.sort((a, b) => {
      const dateA = new Date(getOrderDate(a.order, a.consultationDate)).getTime();
      const dateB = new Date(getOrderDate(b.order, b.consultationDate)).getTime();
      return dateB - dateA;
    });
  }, [consultations]);

  const legalConsents = useMemo(() => {
    const fromOrders = orders
      .filter(item => item.order.consentimiento_aceptado)
      .map(item => ({
        id: `${item.consultationId}-${item.order.id}`,
        source: 'RX',
        text: item.order.consentimiento_texto || 'Sin texto de consentimiento.',
        signedAt: item.order.consentimiento_aceptado_at || item.order.firma_digital_timestamp || item.order.creado_en,
        signature: item.order.firma_digital_base64,
        code: item.consultationCode,
      }));

    const fromConsultations = consultations
      .filter(c => c.detalles_clinicos?.consentimiento_informado?.signed_at)
      .map(c => ({
        id: `${c.id}-general`,
        source: 'General',
        text: 'Consentimiento informado de consulta registrado en evolución clínica.',
        signedAt: c.detalles_clinicos?.consentimiento_informado?.signed_at as string,
        signature: undefined,
        code: resolveConsultationCode(c as any),
      }));

    return [...fromOrders, ...fromConsultations].sort((a, b) => {
      const dA = new Date(a.signedAt || '').getTime();
      const dB = new Date(b.signedAt || '').getTime();
      return dB - dA;
    });
  }, [orders, consultations]);

  const updateOrderInConsultation = async (
    consultationId: string,
    orderId: string,
    updater: (order: RadiologiaOrden) => RadiologiaOrden | null
  ) => {
    const consultation = consultations.find(c => c.id === consultationId);
    if (!consultation) {
      throw new Error('No se encontró la consulta origen del documento.');
    }

    const details = consultation.detalles_clinicos || {};
    const currentOrders: RadiologiaOrden[] = Array.isArray(details.ordenes_radiologia) ? details.ordenes_radiologia : [];
    const nextOrders = currentOrders
      .map(order => (order.id === orderId ? updater(order) : order))
      .filter(Boolean) as RadiologiaOrden[];

    const { error } = await supabase
      .from('consultas_odontologicas')
      .update({ detalles_clinicos: { ...details, ordenes_radiologia: nextOrders } })
      .eq('id', consultationId);

    if (error) throw error;
    await onRefresh();
  };

  const handleDelete = async (consultationId: string, orderId: string) => {
    try {
      setBusyOrderId(orderId);
      setErrorMessage(null);
      await updateOrderInConsultation(consultationId, orderId, () => null);
    } catch (error: any) {
      setErrorMessage(error?.message || 'No se pudo eliminar la orden.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleChangeState = async (
    consultationId: string,
    orderId: string,
    estado: 'pendiente' | 'realizado' | 'archivado'
  ) => {
    try {
      setBusyOrderId(orderId);
      setErrorMessage(null);
      await updateOrderInConsultation(consultationId, orderId, (order) => ({ ...order, estado }));
    } catch (error: any) {
      setErrorMessage(error?.message || 'No se pudo actualizar el estado.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleUploadFile = async (consultationId: string, orderId: string, file: File) => {
    if (!file) return;
    try {
      setBusyOrderId(orderId);
      setErrorMessage(null);

      let uploadedUrl = '';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `patients/${patientId}/radiologia/${Date.now()}_${orderId}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from('patient-files').upload(path, file, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('patient-files').getPublicUrl(path);
        uploadedUrl = data.publicUrl;
      } else {
        if (file.size > 3 * 1024 * 1024) {
          throw new Error('No se pudo subir al bucket patient-files y el archivo supera 3MB para respaldo local.');
        }
        uploadedUrl = await readFileAsDataUrl(file);
      }

      await updateOrderInConsultation(consultationId, orderId, (order) => ({
        ...order,
        imagen_subida_url: uploadedUrl,
      }));
    } catch (error: any) {
      setErrorMessage(error?.message || 'No se pudo subir el archivo.');
    } finally {
      setBusyOrderId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1260,
        background: 'rgba(15,23,42,.42)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
      }}
    >
      <div style={{ width: 'min(1060px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...cardStyle }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #dbe3ec', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>Hub de Archivos del Paciente</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 20, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><FolderOpen size={20} /> Expediente Digital · {patientName}</h3>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: 14, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            onClick={() => setActiveTab('rx')}
            style={{
              border: activeTab === 'rx' ? '1px solid #334155' : '1px solid #cbd5e1',
              background: activeTab === 'rx' ? '#334155' : '#fff',
              color: activeTab === 'rx' ? '#fff' : '#334155',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <FileImage size={15} /> Carpeta RX ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('legal')}
            style={{
              border: activeTab === 'legal' ? '1px solid #334155' : '1px solid #cbd5e1',
              background: activeTab === 'legal' ? '#334155' : '#fff',
              color: activeTab === 'legal' ? '#fff' : '#334155',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <ShieldCheck size={15} /> Carpeta Legal ({legalConsents.length})
          </button>
        </div>

        {errorMessage && (
          <div style={{ margin: '12px 14px 0', border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#991b1b', padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>
            {errorMessage}
          </div>
        )}

        <div style={{ padding: 14, overflow: 'auto' }}>
          {activeTab === 'rx' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {orders.length === 0 && (
                <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#64748b' }}>
                  <Files size={30} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#334155' }}>No hay órdenes radiológicas en el expediente</div>
                  <div style={{ fontSize: 12, marginTop: 5 }}>Se mostrarán aquí las órdenes creadas en cualquier consulta del paciente.</div>
                </div>
              )}

              {orders.map((item) => {
                const orderDate = getOrderDate(item.order, item.consultationDate);
                return (
                  <div key={`${item.consultationId}-${item.order.id}`} style={{ ...cardStyle, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{item.order.tipo}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {orderDate ? new Date(orderDate).toLocaleString('es-CO') : 'Sin fecha'}</span>
                          <span>Consulta: {item.consultationCode}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 700 }}>{item.order.estado}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          value={item.order.estado}
                          onChange={(e) => handleChangeState(item.consultationId, item.order.id, e.target.value as any)}
                          disabled={busyOrderId === item.order.id}
                          style={{ border: '1px solid #cbd5e1', borderRadius: 9, padding: '7px 10px', background: '#fff', fontSize: 12, fontWeight: 700, color: '#334155' }}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="realizado">Realizado</option>
                          <option value="archivado">Archivado</option>
                        </select>

                        <label style={{ border: '1px solid #334155', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 700, background: '#334155', color: '#fff', cursor: busyOrderId === item.order.id ? 'not-allowed' : 'pointer', opacity: busyOrderId === item.order.id ? .6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Upload size={13} /> Subir Archivo
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            disabled={busyOrderId === item.order.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleUploadFile(item.consultationId, item.order.id, file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>

                        <button
                          onClick={() => void handleDelete(item.consultationId, item.order.id)}
                          disabled={busyOrderId === item.order.id}
                          style={{ border: '1px solid #fecaca', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 700, background: '#fff1f2', color: '#991b1b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12.5, color: '#334155', lineHeight: 1.6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                      <strong>Justificación:</strong> {item.order.justificacion_automatica || 'Sin justificación registrada.'}
                      {item.order.piezas_solicitadas?.length ? <div style={{ marginTop: 4 }}><strong>Piezas solicitadas:</strong> {item.order.piezas_solicitadas.join(', ')}</div> : null}
                    </div>

                    {item.order.imagen_subida_url ? (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <a href={item.order.imagen_subida_url} target="_blank" rel="noreferrer" style={{ color: '#0f172a', fontWeight: 800 }}>
                          Abrir archivo cargado
                        </a>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>Sin archivo adjunto todavía.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'legal' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {legalConsents.length === 0 && (
                <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#64748b' }}>
                  <ShieldCheck size={30} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#334155' }}>Sin consentimientos históricos</div>
                  <div style={{ fontSize: 12, marginTop: 5 }}>Los consentimientos firmados aparecerán aquí automáticamente.</div>
                </div>
              )}

              {legalConsents.map((consent) => (
                <div key={consent.id} style={{ ...cardStyle, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Consentimiento {consent.source}</div>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={13} /> {consent.signedAt ? new Date(consent.signedAt).toLocaleString('es-CO') : 'Sin fecha'} · {consent.code}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#334155', lineHeight: 1.6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, whiteSpace: 'pre-wrap' }}>
                    {consent.text}
                  </div>
                  {consent.signature && (
                    <div style={{ marginTop: 10 }}>
                      <img src={consent.signature} alt="Firma digital" style={{ maxHeight: 82, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
