
/**
 * InventoryHub.tsx
 * Sistema de Inventario Clínico Odontológico — EstDent Pro
 * Módulo completo de gestión de inventario dental:
 *   - Catálogo con tabla estilo Excel
 *   - Categorías profesionales sincronizadas automáticamente
 *   - Entradas de stock y movimientos
 *   - Auto-descuento al guardar consultas (General / Ortodoncia)
 *   - Alertas de stock mínimo
 *   - Acciones rápidas junto al buscador
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../shared/lib/supabase';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  activa: boolean;
  created_at?: string;
}

interface ItemInventario {
  id: string;
  nombre: string;
  categoria_id: string;
  categoria?: Categoria;
  descripcion: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  precio_unitario: number;
  proveedor: string;
  codigo_interno: string;
  descuento_consulta_general: number;
  descuento_consulta_ortodoncia: number;
  activo: boolean;
  ubicacion: string;
  lote: string;
  fecha_vencimiento: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Movimiento {
  id: string;
  item_id: string;
  item?: ItemInventario;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'descuento_consulta';
  cantidad: number;
  stock_antes: number;
  stock_despues: number;
  motivo: string;
  referencia: string;
  usuario: string;
  created_at: string;
}

type TabKey = 'catalogo' | 'movimientos' | 'alertas';
type SortField = keyof ItemInventario;
type SortDir = 'asc' | 'desc';

// ─── CATEGORÍAS PREDETERMINADAS ───────────────────────────────────────────────

const CATEGORIAS_PREDETERMINADAS: Omit<Categoria, 'id' | 'created_at'>[] = [
  { nombre: 'Implementos Generales (Libre)', descripcion: 'Categoria libre para implementos personalizados del consultorio.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Resinas y Adhesivos', descripcion: 'Resinas compuestas, sistemas adhesivos, grabadores y accesorios restauradores.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Anestesia', descripcion: 'Carpules, agujas, jeringas aspirantes y anestesia topica.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Ortodoncia Fija', descripcion: 'Brackets, tubos, bandas, ligaduras, cementos y accesorios para ortodoncia fija.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Ortodoncia Removible', descripcion: 'Alineadores, retenedores, cajas, accesorios y aditamentos removibles.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Endodoncia', descripcion: 'Limas manuales y rotatorias, conos, selladores, irrigantes y puntas.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Periodoncia', descripcion: 'Curetas, puntas, geles periodontales y biomateriales de soporte.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Cirugia Oral', descripcion: 'Suturas, hojas de bisturi, material hemostatico y kits de exodoncia.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Implantologia', descripcion: 'Componentes de implante, kits quirurgicos y material protetico implantosoportado.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Protesis Fija', descripcion: 'Cementos, postes, pernos, provisionales y material para coronas/puentes.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Protesis Removible', descripcion: 'Acrilicos, dientes prefabricados, ganchos y consumibles de laboratorio.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Odontopediatria', descripcion: 'Materiales pediatricos, ionomeros, sellantes y consumibles especificos.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Operatoria Dental', descripcion: 'Matrices, cunas, sistemas de acabado y pulido, instrumentacion clinica diaria.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Radiologia', descripcion: 'Sensores, placas, posicionadores y consumibles para diagnostico por imagen.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Esterilizacion', descripcion: 'Bolsas de esterilizacion, cintas, indicadores biologicos y quimicos.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Bioseguridad', descripcion: 'Guantes, mascarillas, gorros, batas y proteccion personal del equipo clinico.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Desechables Clinicos', descripcion: 'Baberos, vasos, eyectores, gasas, rollos de algodon y descartables.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Farmacia Clinica', descripcion: 'Analgésicos, antiinflamatorios, antibioticos y medicacion de apoyo.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Blanqueamiento', descripcion: 'Geles de blanqueamiento, barreras, cubetas y accesorios.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Material de Impresion', descripcion: 'Alginatos, siliconas, cubetas y adhesivos para impresion.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Laboratorio Dental', descripcion: 'Yesos, ceras, revestimientos, discos y fresas de laboratorio.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Mantenimiento Equipos', descripcion: 'Consumibles de mantenimiento preventivo y correctivo de equipos.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Limpieza y Desinfeccion', descripcion: 'Desinfectantes de superficies, detergentes enzimaticos y sanitizantes.', color: '#9ca3af', icono: 'CAT', activa: true },
  { nombre: 'Administrativo', descripcion: 'Papeleria clinica, etiquetas, formularios y utiles operativos.', color: '#9ca3af', icono: 'CAT', activa: true },
];

const UNIDADES = ['unidad', 'caja', 'paquete', 'frasco', 'tubo', 'rollo', 'par', 'kit', 'carpule', 'cm', 'ml', 'gramos', 'litro'];

// ─── HELPERS VISUALES ────────────────────────────────────────────────────────

function stockBadge(actual: number, minimo: number): React.ReactElement {
  if (actual <= 0) return <span style={{ background: '#e5e7eb', color: '#111827', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>SIN STOCK</span>;
  if (actual <= minimo) return <span style={{ background: '#e5e7eb', color: '#374151', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>CRITICO</span>;
  if (actual <= minimo * 1.5) return <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>BAJO</span>;
  return <span style={{ background: '#f9fafb', color: '#6b7280', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>OK</span>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; }
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export function InventoryHub() {
  const [activeTab, setActiveTab] = useState<TabKey>('catalogo');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [initMsg, setInitMsg] = useState('Preparando módulo de inventario…');

  // Catálogo state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<Partial<ItemInventario> | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<'create' | 'edit'>('create');
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  // Entradas state
  const [entradaItemId, setEntradaItemId] = useState('');
  const [entradaCantidad, setEntradaCantidad] = useState('');
  const [entradaMotivo, setEntradaMotivo] = useState('');
  const [entradaLote, setEntradaLote] = useState('');
  const [entradaProveedor, setEntradaProveedor] = useState('');
  const [showEntradaWindow, setShowEntradaWindow] = useState(false);

  // Notificación inline
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const CATEGORY_SUGGESTIONS = [
    { nombre: 'Implementos para Diagnostico', descripcion: 'Espejos, sondas periodontales, exploradores y pinzas de examen.' },
    { nombre: 'Implementos para Profilaxis', descripcion: 'Copas, cepillos, pastas profilacticas y accesorios de limpieza.' },
    { nombre: 'Implementos Quirurgicos', descripcion: 'Mangos de bisturi, separadores, portaagujas y pinzas quirurgicas.' },
    { nombre: 'Implementos de Restauracion', descripcion: 'Espatulas, portaamalgama, atacadores y bruñidores.' },
    { nombre: 'Insumos de Impresion Digital', descripcion: 'Puntas, sleeves, sprays y consumibles para escaner intraoral.' },
    { nombre: 'Insumos de Urgencias', descripcion: 'Material hemostatico, analgesia inmediata y kit de urgencias.' },
    { nombre: 'Insumos de Control de Infeccion', descripcion: 'Barreras, film plastico, desinfectantes y toallas de superficie.' },
    { nombre: 'Implementos de Ortodoncia Clinica', descripcion: 'Alicates, posicionadores y auxiliares de ajuste ortodontico.' },
  ];

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const clearEntradaForm = useCallback(() => {
    setEntradaItemId('');
    setEntradaCantidad('');
    setEntradaMotivo('');
    setEntradaLote('');
    setEntradaProveedor('');
  }, []);

  const openEntradaWindow = useCallback((itemId?: string) => {
    if (itemId) setEntradaItemId(itemId);
    setShowEntradaWindow(true);
  }, []);

  // ── Inicializar BD ────────────────────────────────────────────────────────
  const initDB = useCallback(async () => {
    setLoading(true);
    setInitMsg('Verificando tablas de inventario…');

    // Intentar leer tabla categorias_inventario
    const { error: catErr } = await supabase.from('categorias_inventario').select('id').limit(1);
    if (catErr) {
      setInitMsg('Creando estructura de base de datos…');
      await crearEstructuraBD();
    }

    setInitMsg('Sincronizando categorias profesionales…');
    await sincronizarCategoriasConsultorio();

    setInitMsg('Cargando datos…');
    await Promise.all([loadCategorias(), loadItems(), loadMovimientos()]);
    setDbReady(true);
    setLoading(false);
  }, []); // eslint-disable-line

  useEffect(() => { initDB(); }, [initDB]);

  async function crearEstructuraBD() {
    // Crear tabla categorias_inventario
    try {
      await supabase.rpc('exec_sql', {
        sql: `CREATE TABLE IF NOT EXISTS categorias_inventario (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL,
          descripcion TEXT DEFAULT '',
          color TEXT DEFAULT '#9ca3af',
          icono TEXT DEFAULT 'CAT',
          activa BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      });
    } catch { /* ignore: tabla ya existe o no hay soporte exec_sql */ }

    // Crear tabla inventario_items
    try {
      await supabase.rpc('exec_sql', {
        sql: `CREATE TABLE IF NOT EXISTS inventario_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL,
          categoria_id UUID REFERENCES categorias_inventario(id),
          descripcion TEXT DEFAULT '',
          unidad TEXT DEFAULT 'unidad',
          stock_actual NUMERIC DEFAULT 0,
          stock_minimo NUMERIC DEFAULT 0,
          stock_maximo NUMERIC DEFAULT 100,
          precio_unitario NUMERIC DEFAULT 0,
          proveedor TEXT DEFAULT '',
          codigo_interno TEXT DEFAULT '',
          descuento_consulta_general NUMERIC DEFAULT 0,
          descuento_consulta_ortodoncia NUMERIC DEFAULT 0,
          activo BOOLEAN DEFAULT true,
          ubicacion TEXT DEFAULT '',
          lote TEXT DEFAULT '',
          fecha_vencimiento DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
      });
    } catch { /* ignore */ }

    // Crear tabla movimientos_inventario
    try {
      await supabase.rpc('exec_sql', {
        sql: `CREATE TABLE IF NOT EXISTS movimientos_inventario (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID REFERENCES inventario_items(id),
          tipo TEXT NOT NULL,
          cantidad NUMERIC NOT NULL,
          stock_antes NUMERIC DEFAULT 0,
          stock_despues NUMERIC DEFAULT 0,
          motivo TEXT DEFAULT '',
          referencia TEXT DEFAULT '',
          usuario TEXT DEFAULT 'Sistema',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      });
    } catch { /* ignore */ }

    // Sincronizar categorías predeterminadas
    await sincronizarCategoriasConsultorio();
  }

  async function sincronizarCategoriasConsultorio() {
    const { data: existentes, error } = await supabase
      .from('categorias_inventario')
      .select('id, nombre');

    if (error) return;

    const mapa = new Map(
      (existentes || []).map((cat: { id: string; nombre: string }) => [cat.nombre.toLowerCase(), cat.id])
    );

    for (const cat of CATEGORIAS_PREDETERMINADAS) {
      const key = cat.nombre.toLowerCase();
      const existenteId = mapa.get(key);

      if (existenteId) {
        await supabase
          .from('categorias_inventario')
          .update({ descripcion: cat.descripcion, color: cat.color, icono: cat.icono, activa: true })
          .eq('id', existenteId);
      } else {
        await supabase.from('categorias_inventario').insert({ ...cat });
      }
    }
  }

  // ── Loaders ───────────────────────────────────────────────────────────────
  async function loadCategorias() {
    const { data, error } = await supabase.from('categorias_inventario').select('*').order('nombre');
    if (!error && data) setCategorias(data as Categoria[]);
  }

  async function loadItems() {
    const { data, error } = await supabase
      .from('inventario_items')
      .select(`*, categoria:categorias_inventario(*)`)
      .order('nombre');
    if (!error && data) setItems(data as ItemInventario[]);
  }

  async function loadMovimientos() {
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select(`*, item:inventario_items(nombre, unidad)`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setMovimientos(data as Movimiento[]);
  }

  async function crearCategoriaDesdeFormulario(nombreBase: string, descripcionBase?: string) {
    const nombre = nombreBase.trim();
    const descripcion = (descripcionBase || '').trim();

    if (!nombre) {
      showToast('Debes escribir un nombre de categoria.', 'error');
      return;
    }

    const existente = categorias.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (existente) {
      setEditingItem(prev => ({ ...prev, categoria_id: existente.id }));
      showToast(`La categoria "${nombre}" ya existe y fue seleccionada.`, 'info');
      return;
    }

    const { data, error } = await supabase
      .from('categorias_inventario')
      .insert({
        nombre,
        descripcion: descripcion || 'Categoria creada desde formulario de inventario.',
        color: '#9ca3af',
        icono: 'CAT',
        activa: true,
      })
      .select('id, nombre')
      .single();

    if (error) {
      showToast('No se pudo crear la categoria: ' + error.message, 'error');
      return;
    }

    await loadCategorias();
    if (data?.id) {
      setEditingItem(prev => ({ ...prev, categoria_id: data.id }));
    }

    setNewCategoryName('');
    setNewCategoryDescription('');
    showToast(`Categoria "${nombre}" creada y seleccionada.`);
  }

  // ── CRUD Items ────────────────────────────────────────────────────────────
  async function saveItem(item: Partial<ItemInventario>) {
    if (!item.nombre?.trim()) { showToast('El nombre del ítem es obligatorio.', 'error'); return; }
    if (!item.categoria_id) { showToast('Debes seleccionar una categoría.', 'error'); return; }

    const payload = {
      nombre: item.nombre.trim(),
      categoria_id: item.categoria_id,
      descripcion: item.descripcion || '',
      unidad: item.unidad || 'unidad',
      stock_actual: Number(item.stock_actual) || 0,
      stock_minimo: Number(item.stock_minimo) || 0,
      stock_maximo: Number(item.stock_maximo) || 100,
      precio_unitario: Number(item.precio_unitario) || 0,
      proveedor: item.proveedor || '',
      codigo_interno: item.codigo_interno || '',
      descuento_consulta_general: Number(item.descuento_consulta_general) || 0,
      descuento_consulta_ortodoncia: Number(item.descuento_consulta_ortodoncia) || 0,
      activo: item.activo !== false,
      ubicacion: item.ubicacion || '',
      lote: item.lote || '',
      fecha_vencimiento: item.fecha_vencimiento || null,
      updated_at: new Date().toISOString(),
    };

    if (itemModalMode === 'edit' && item.id) {
      const { error } = await supabase.from('inventario_items').update(payload).eq('id', item.id);
      if (error) { showToast('Error al actualizar ítem: ' + error.message, 'error'); return; }
      showToast(`"${payload.nombre}" actualizado correctamente.`);
    } else {
      const existingItem = items.find(i =>
        i.categoria_id === payload.categoria_id &&
        i.nombre.trim().toLowerCase() === payload.nombre.trim().toLowerCase()
      );

      if (existingItem) {
        setShowItemModal(false);
        setEditingItem(null);
        openEntradaWindow(existingItem.id);
        showToast('Este item ya existe. Usa Registrar Entrada para aumentar stock.', 'info');
        return;
      }

      const { error } = await supabase.from('inventario_items').insert(payload);
      if (error) { showToast('Error al crear ítem: ' + error.message, 'error'); return; }
      showToast(`"${payload.nombre}" creado en inventario.`);
    }
    setShowItemModal(false);
    setEditingItem(null);
    await loadItems();
  }

  async function deleteItem(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar "${nombre}" del inventario? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('inventario_items').delete().eq('id', id);
    if (error) { showToast('Error al eliminar: ' + error.message, 'error'); return; }
    showToast(`"${nombre}" eliminado.`, 'info');
    setSelectedItems(prev => { const n = new Set(prev); n.delete(id); return n; });
    await loadItems();
  }

  async function toggleItemActivo(item: ItemInventario) {
    const { error } = await supabase.from('inventario_items').update({ activo: !item.activo }).eq('id', item.id);
    if (!error) { showToast(item.activo ? `"${item.nombre}" desactivado.` : `"${item.nombre}" activado.`, 'info'); await loadItems(); }
  }

  // ── Entradas de stock ─────────────────────────────────────────────────────
  async function registrarEntrada() {
    if (!entradaItemId) { showToast('Selecciona un ítem.', 'error'); return; }
    const cantidad = Number(entradaCantidad);
    if (!cantidad || cantidad <= 0) { showToast('Ingresa una cantidad válida.', 'error'); return; }

    const item = items.find(i => i.id === entradaItemId);
    if (!item) return;

    const stockAntes = item.stock_actual;
    const stockDespues = stockAntes + cantidad;

    const { error: updErr } = await supabase.from('inventario_items').update({ stock_actual: stockDespues, updated_at: new Date().toISOString() }).eq('id', entradaItemId);
    if (updErr) { showToast('Error al actualizar stock: ' + updErr.message, 'error'); return; }

    await supabase.from('movimientos_inventario').insert({
      item_id: entradaItemId,
      tipo: 'entrada',
      cantidad,
      stock_antes: stockAntes,
      stock_despues: stockDespues,
      motivo: entradaMotivo || 'Entrada manual',
      referencia: `LOTE: ${entradaLote || '—'} | Prov: ${entradaProveedor || '—'}`,
      usuario: 'Operador',
    });

    showToast(`Entrada de ${cantidad} ${item.unidad}(s) registrada para "${item.nombre}".`);
    clearEntradaForm();
    await Promise.all([loadItems(), loadMovimientos()]);
  }

  // ── Ajuste rápido de stock desde catálogo ─────────────────────────────────
  async function ajusteRapido(item: ItemInventario, delta: number) {
    const nuevoStock = Math.max(0, item.stock_actual + delta);
    const { error } = await supabase.from('inventario_items').update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    await supabase.from('movimientos_inventario').insert({
      item_id: item.id,
      tipo: 'ajuste',
      cantidad: Math.abs(delta),
      stock_antes: item.stock_actual,
      stock_despues: nuevoStock,
      motivo: delta > 0 ? 'Ajuste positivo manual' : 'Ajuste negativo manual',
      referencia: '',
      usuario: 'Operador',
    });
    await Promise.all([loadItems(), loadMovimientos()]);
  }

  // ── Selección masiva ──────────────────────────────────────────────────────
  function toggleSelectAll(visibleIds: string[]) {
    if (visibleIds.every(id => selectedItems.has(id))) {
      setSelectedItems(prev => { const n = new Set(prev); visibleIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedItems(prev => { const n = new Set(prev); visibleIds.forEach(id => n.add(id)); return n; });
    }
  }

  async function eliminarSeleccionados() {
    if (selectedItems.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedItems.size} ítem(s) seleccionado(s)?`)) return;
    for (const id of Array.from(selectedItems)) {
      await supabase.from('inventario_items').delete().eq('id', id);
    }
    showToast(`${selectedItems.size} ítem(s) eliminado(s).`, 'info');
    setSelectedItems(new Set());
    await loadItems();
  }

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  function exportarCSV() {
    const headers = ['Código', 'Nombre', 'Categoría', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Stock Máximo', 'Precio Unitario', 'Proveedor', 'Ubicación', 'Lote', 'Vencimiento', 'Estado'];
    const rows = filteredItems.map(i => [
      i.codigo_interno, i.nombre, i.categoria?.nombre || '', i.unidad,
      i.stock_actual, i.stock_minimo, i.stock_maximo, i.precio_unitario,
      i.proveedor, i.ubicacion, i.lote, i.fecha_vencimiento || '',
      i.activo ? 'Activo' : 'Inactivo'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `inventario_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado correctamente.');
  }

  // ── Filtros y ordenación ──────────────────────────────────────────────────
  const filteredItems = items
    .filter(i => {
      if (filterStatus === 'activo' && !i.activo) return false;
      if (filterStatus === 'inactivo' && i.activo) return false;
      if (filterStatus === 'critico' && i.stock_actual > i.stock_minimo) return false;
      if (filterStatus === 'sinstock' && i.stock_actual > 0) return false;
      if (filterCat !== 'all' && i.categoria_id !== filterCat) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return i.nombre.toLowerCase().includes(t) || i.codigo_interno.toLowerCase().includes(t) || i.proveedor.toLowerCase().includes(t) || (i.descripcion || '').toLowerCase().includes(t);
      }
      return true;
    })
    .sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortField as string] ?? '';
      const bv = (b as unknown as Record<string, unknown>)[sortField as string] ?? '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const alertasItems = items.filter(i => i.activo && i.stock_actual <= i.stock_minimo);
  const valorTotal = items.reduce((s, i) => s + i.stock_actual * i.precio_unitario, 0);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  // ─── ESTILOS BASE ────────────────────────────────────────────────────────

  const cssVars = {
    '--inv-bg': '#f1f5f9',
    '--inv-card': '#ffffff',
    '--inv-border': '#e2e8f0',
    '--inv-shadow': '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    '--inv-shadow-lg': '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
    '--inv-shadow-3d': '0 10px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
    '--inv-accent': '#6b7280',
    '--inv-header': '#f8fafc',
    '--inv-row-hover': '#f3f4f6',
    '--inv-text': '#1e293b',
    '--inv-muted': '#64748b',
  } as React.CSSProperties;

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, background: '#f1f5f9' }}>
        <div style={{ width: 56, height: 56, border: '4px solid #e2e8f0', borderTop: '4px solid #6b7280', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>{initMsg}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ ...cssVars, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--inv-bg)', fontFamily: "'Inter', 'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* ── TOAST ── */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: toastMsg.type === 'success' ? '#374151' : toastMsg.type === 'error' ? '#111827' : '#6b7280',
          color: '#fff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'slideIn 0.3s ease',
          maxWidth: 380,
        }}>
          {toastMsg.text}
        </div>
      )}

      {/* ── HEADER PRINCIPAL EN CARD ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f7 50%, #e5e7eb 100%)',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 28px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06)',
          padding: '18px 20px 14px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decoración de fondo */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: 'rgba(148,163,184,0.10)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -50, left: 120, width: 140, height: 140, background: 'rgba(148,163,184,0.08)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.5px' }}>Inventario Clinico</h1>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>Sistema de Gestion de Insumos Odontologicos - EstDent Pro</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Items', value: items.filter(i => i.activo).length, color: '#111827' },
                  { label: 'En Alerta', value: alertasItems.length, color: '#374151' },
                  { label: 'Categorias', value: categorias.length, color: '#4b5563' },
                  { label: 'Valor Total', value: formatCurrency(valorTotal), color: '#111827' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: '#ffffffd9', borderRadius: 12, padding: '8px 14px', border: '1px solid #e5e7eb', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>{kpi.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── TABS ── */}
          <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            {([
              { key: 'catalogo', label: 'Catalogo', badge: items.length },
              { key: 'movimientos', label: 'Movimientos', badge: movimientos.length > 99 ? '99+' : movimientos.length || null },
              { key: 'alertas', label: 'Alertas', badge: alertasItems.length > 0 ? alertasItems.length : null },
            ] as { key: TabKey; label: string; badge: number | string | null }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: 13,
                  background: activeTab === tab.key ? '#ffffff' : '#e5e7eb',
                  color: activeTab === tab.key ? '#111827' : '#4b5563',
                  boxShadow: activeTab === tab.key ? '0 4px 10px rgba(15,23,42,0.08)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6,
                  position: 'relative',
                }}
              >
                {tab.label}
                {tab.badge !== null && (
                  <span style={{
                    background: activeTab === tab.key ? '#4b5563' : '#9ca3af',
                    color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', minWidth: 18, textAlign: 'center',
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENIDO DE LA TAB ACTIVA ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {/* ════════════════════════════════════════════════════════════ CATÁLOGO */}
        {activeTab === 'catalogo' && (
          <div>
            {/* Toolbar catálogo */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Búsqueda */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <input
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, codigo, proveedor..."
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#1e293b' }}
                />
              </div>
              {/* Filtro categoría */}
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle}>
                <option value="all">Todas las categorías</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {/* Filtro estado */}
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                <option value="all">Todos los estados</option>
                <option value="activo">Solo activos</option>
                <option value="inactivo">Solo inactivos</option>
                <option value="critico">Stock crítico</option>
                <option value="sinstock">Sin stock</option>
              </select>
              {/* Acciones */}
              <button onClick={() => { setEditingItem({ activo: true, unidad: 'unidad', stock_actual: 0, stock_minimo: 5, stock_maximo: 100, descuento_consulta_general: 0, descuento_consulta_ortodoncia: 0 }); setItemModalMode('create'); setShowItemModal(true); }} style={btnPrimaryStyle}>
                Nuevo Item
              </button>
              <button onClick={() => openEntradaWindow()} style={btnSecondaryStyle}>Nueva Entrada</button>
              <button onClick={async () => {
                setLoading(true);
                await sincronizarCategoriasConsultorio();
                await Promise.all([loadCategorias(), loadItems(), loadMovimientos()]);
                setLoading(false);
                showToast('Inventario sincronizado.', 'info');
              }} style={btnSecondaryStyle}>Sincronizar</button>
              <button onClick={async () => {
                setLoading(true);
                await Promise.all([loadCategorias(), loadItems(), loadMovimientos()]);
                setLoading(false);
                showToast('Datos recargados.', 'info');
              }} style={btnSecondaryStyle}>Recargar</button>
              {selectedItems.size > 0 && (
                <button onClick={eliminarSeleccionados} style={btnDangerStyle}>
                  Eliminar ({selectedItems.size})
                </button>
              )}
              <button onClick={exportarCSV} style={btnSecondaryStyle}>CSV</button>
            </div>

            {/* Info de resultados */}
            <div style={{ marginBottom: 10, fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> ítems</span>
              <span>Valor total en vista: <strong>{formatCurrency(filteredItems.reduce((s, i) => s + i.stock_actual * i.precio_unitario, 0))}</strong></span>
            </div>

            {/* Tabla Excel-style */}
            <div style={{
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 8px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ ...thStyle, width: 36 }}>
                      <input type="checkbox" onChange={() => toggleSelectAll(filteredItems.map(i => i.id))}
                        checked={filteredItems.length > 0 && filteredItems.every(i => selectedItems.has(i.id))}
                        style={{ cursor: 'pointer' }} />
                    </th>
                    {[
                      { field: 'codigo_interno' as SortField, label: 'Código' },
                      { field: 'nombre' as SortField, label: 'Nombre / Descripción' },
                      { field: 'categoria_id' as SortField, label: 'Categoría' },
                      { field: 'stock_actual' as SortField, label: 'Stock' },
                      { field: 'unidad' as SortField, label: 'Unidad' },
                      { field: 'precio_unitario' as SortField, label: 'P. Unitario' },
                      { field: 'proveedor' as SortField, label: 'Proveedor' },
                    ].map(col => (
                      <th key={col.field} onClick={() => handleSort(col.field)} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        {col.label} {sortField === col.field ? (sortDir === 'asc' ? '▲' : '▼') : <span style={{ color: '#cbd5e1' }}>⇅</span>}
                      </th>
                    ))}
                    <th style={{ ...thStyle, width: 80 }}>Descuento</th>
                    <th style={{ ...thStyle, width: 80 }}>Estado</th>
                    <th style={{ ...thStyle, width: 120 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Sin resultados</div>
                        <div style={{ fontSize: 13 }}>Ajusta los filtros o crea un nuevo item.</div>
                      </td>
                    </tr>
                  ) : filteredItems.map((item, idx) => (
                    <tr key={item.id}
                      style={{ background: selectedItems.has(item.id) ? '#e5e7eb' : idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!selectedItems.has(item.id)) e.currentTarget.style.background = '#f3f4f6'; }}
                      onMouseLeave={e => { if (!selectedItems.has(item.id)) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'; }}>
                      <td style={{ ...tdStyle, width: 36 }}>
                        <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => setSelectedItems(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{item.codigo_interno || '—'}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.nombre}</div>
                        {item.descripcion && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</div>}
                        {item.ubicacion && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Ubicacion: {item.ubicacion}</div>}
                      </td>
                      <td style={tdStyle}>
                        {item.categoria ? (
                          <span style={{ background: item.categoria.color + '18', color: item.categoria.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {item.categoria.nombre}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => ajusteRapido(item, -1)} style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontWeight: 700, color: item.stock_actual <= item.stock_minimo ? '#374151' : '#1e293b', minWidth: 40, textAlign: 'center', fontSize: 14 }}>{item.stock_actual}</span>
                          <button onClick={() => ajusteRapido(item, 1)} style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                        <div style={{ marginTop: 3 }}>{stockBadge(item.stock_actual, item.stock_minimo)}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>mín: {item.stock_minimo} / máx: {item.stock_maximo}</div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>{item.unidad}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#374151' }}>{formatCurrency(item.precio_unitario)}</td>
                      <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>{item.proveedor || '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 11, textAlign: 'center' }}>
                        {item.descuento_consulta_general > 0 && <div style={{ color: '#374151' }}>Gral: −{item.descuento_consulta_general}</div>}
                        {item.descuento_consulta_ortodoncia > 0 && <div style={{ color: '#6b7280' }}>Ort: −{item.descuento_consulta_ortodoncia}</div>}
                        {!item.descuento_consulta_general && !item.descuento_consulta_ortodoncia && <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button onClick={() => toggleItemActivo(item)} style={{ background: item.activo ? '#e5e7eb' : '#f1f5f9', color: item.activo ? '#374151' : '#94a3b8', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </button>
                        {item.fecha_vencimiento && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Vence: {formatDate(item.fecha_vencimiento)}</div>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            onClick={() => { setEditingItem({ ...item }); setItemModalMode('edit'); setShowItemModal(true); }}
                            style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            title="Editar"
                          >E</button>
                          <button
                            onClick={() => deleteItem(item.id, item.nombre)}
                            style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 12 }}
                            title="Eliminar"
                          >X</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ MOVIMIENTOS */}
        {activeTab === 'movimientos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Registro de Movimientos</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Historial completo de entradas, salidas, ajustes y descuentos automáticos por consultas.</p>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Ítem</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Cantidad</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Antes → Después</th>
                    <th style={thStyle}>Motivo</th>
                    <th style={thStyle}>Referencia</th>
                    <th style={thStyle}>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No hay movimientos registrados.</td></tr>
                  ) : movimientos.map((mov, idx) => {
                    const tipoConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
                      entrada: { label: 'Entrada', color: '#374151', bg: '#e5e7eb', icon: 'IN' },
                      salida: { label: 'Salida', color: '#111827', bg: '#e5e7eb', icon: 'OUT' },
                      ajuste: { label: 'Ajuste', color: '#4b5563', bg: '#f3f4f6', icon: 'AJ' },
                      descuento_consulta: { label: 'Consulta', color: '#6b7280', bg: '#f3f4f6', icon: 'CO' },
                    };
                    const tc = tipoConfig[mov.tipo] || { label: mov.tipo, color: '#64748b', bg: '#f1f5f9', icon: 'REG' };
                    return (
                      <tr key={mov.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...tdStyle, color: '#64748b', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {new Date(mov.created_at).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{(mov.item as { nombre?: string })?.nombre || mov.item_id}</td>
                        <td style={tdStyle}>
                          <span style={{ background: tc.bg, color: tc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {tc.icon} {tc.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: mov.tipo === 'entrada' ? '#374151' : '#111827' }}>
                          {mov.tipo === 'entrada' ? '+' : '−'}{mov.cantidad}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
                          {mov.stock_antes} → {mov.stock_despues}
                        </td>
                        <td style={{ ...tdStyle, color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mov.motivo}</td>
                        <td style={{ ...tdStyle, color: '#64748b', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mov.referencia || '—'}</td>
                        <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>{mov.usuario}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ ALERTAS */}
        {activeTab === 'alertas' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Alertas de Stock</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Ítems que requieren reposición inmediata. Revisa y programa pedidos a proveedores.</p>
            </div>

            {alertasItems.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: '60px 32px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Todo el inventario esta en orden</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>Ningún ítem activo se encuentra por debajo del stock mínimo.</div>
              </div>
            ) : (
              <div>
                {/* Resumen */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Sin Stock', count: alertasItems.filter(i => i.stock_actual <= 0).length, color: '#111827', bg: '#e5e7eb' },
                    { label: 'Critico (<= min)', count: alertasItems.filter(i => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo).length, color: '#374151', bg: '#e5e7eb' },
                    { label: 'Categorias afectadas', count: new Set(alertasItems.map(i => i.categoria_id)).size, color: '#4b5563', bg: '#f3f4f6' },
                    { label: 'Valor comprometido', count: formatCurrency(alertasItems.reduce((s, i) => s + i.stock_minimo * i.precio_unitario, 0)), color: '#111827', bg: '#f3f4f6' },
                  ].map(card => (
                    <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${card.color}28` }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.count}</div>
                      <div style={{ fontSize: 12, color: card.color, fontWeight: 600, opacity: 0.8 }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Lista de alertas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                  {alertasItems.map(item => {
                    const sinStock = item.stock_actual <= 0;
                    return (
                      <div key={item.id} style={{
                        background: '#fff', borderRadius: 14, padding: '18px 20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        border: '1px solid #d1d5db',
                        borderLeft: `4px solid ${sinStock ? '#374151' : '#6b7280'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{item.nombre}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.categoria?.nombre}</div>
                          </div>
                          {stockBadge(item.stock_actual, item.stock_minimo)}
                        </div>

                        {/* Barra de progreso */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                            <span>Stock: <strong>{item.stock_actual} {item.unidad}</strong></span>
                            <span>Mínimo: <strong>{item.stock_minimo}</strong></span>
                          </div>
                          <div style={{ background: '#f1f5f9', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 20,
                              width: `${Math.min(100, (item.stock_actual / Math.max(item.stock_maximo, 1)) * 100)}%`,
                              background: sinStock ? '#374151' : item.stock_actual <= item.stock_minimo ? '#6b7280' : '#9ca3af',
                              transition: 'width 0.3s',
                            }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => openEntradaWindow(item.id)}
                            style={{ flex: 1, background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            Nueva Entrada
                          </button>
                          <button
                            onClick={() => { setEditingItem({ ...item }); setItemModalMode('edit'); setShowItemModal(true); setActiveTab('catalogo'); }}
                            style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 12 }}
                          >E</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── VENTANA FLOTANTE: NUEVA ENTRADA ───────────────────────────────── */}
      {showEntradaWindow && (
        <div style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: 'min(760px, calc(100vw - 32px))',
          maxHeight: '82vh',
          background: '#fff',
          border: '1px solid #d1d5db',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(15,23,42,0.28)',
          zIndex: 950,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            borderBottom: '1px solid #d1d5db',
            cursor: 'default',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Nueva Entrada - Inventario</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowEntradaWindow(false)} style={{ ...btnDangerStyle, padding: '4px 10px', fontSize: 12 }}>X</button>
            </div>
          </div>

          <div style={{ padding: 14, overflowY: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Item de Inventario *</label>
                <select value={entradaItemId} onChange={e => setEntradaItemId(e.target.value)} style={{ ...selectStyle, width: '100%', fontSize: 14, padding: '10px 12px' }}>
                  <option value="">— Selecciona un item —</option>
                  {categorias.map(cat => {
                    const catItems = items.filter(i => i.categoria_id === cat.id && i.activo);
                    if (catItems.length === 0) return null;
                    return (
                      <optgroup key={cat.id} label={cat.nombre}>
                        {catItems.map(i => <option key={i.id} value={i.id}>{i.nombre} — Stock actual: {i.stock_actual} {i.unidad}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
                {entradaItemId && (() => {
                  const it = items.find(i => i.id === entradaItemId);
                  if (!it) return null;
                  return (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: '#f3f4f6', borderRadius: 8, border: '1px solid #d1d5db', display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                      <span>Stock actual: <strong>{it.stock_actual} {it.unidad}</strong></span>
                      <span>Minimo: <strong>{it.stock_minimo}</strong></span>
                      <span>Maximo: <strong>{it.stock_maximo}</strong></span>
                      <span>P.U.: <strong>{formatCurrency(it.precio_unitario)}</strong></span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={labelStyle}>Cantidad a Ingresar *</label>
                <input type="number" min="1" value={entradaCantidad} onChange={e => setEntradaCantidad(e.target.value)} placeholder="ej: 50" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Motivo / Tipo de Entrada</label>
                <select value={entradaMotivo} onChange={e => setEntradaMotivo(e.target.value)} style={{ ...selectStyle, width: '100%', padding: '10px 12px' }}>
                  <option value="">Seleccionar motivo</option>
                  <option value="Compra a proveedor">Compra a proveedor</option>
                  <option value="Donacion">Donacion</option>
                  <option value="Inventario fisico — correccion positiva">Inventario fisico — correccion positiva</option>
                  <option value="Devolucion de paciente">Devolucion de paciente</option>
                  <option value="Traslado entre consultorios">Traslado entre consultorios</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Lote / Numero de Lote</label>
                <input value={entradaLote} onChange={e => setEntradaLote(e.target.value)} placeholder="ej: LOTE-2024-001" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Proveedor</label>
                <input value={entradaProveedor} onChange={e => setEntradaProveedor(e.target.value)} placeholder="ej: Dentsply Sirona" style={inputStyle} />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={clearEntradaForm} style={btnSecondaryStyle}>Limpiar</button>
                <button onClick={registrarEntrada} style={btnPrimaryStyle}>Registrar Entrada</button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Ultimas Entradas Registradas</h3>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {movimientos.filter(m => m.tipo === 'entrada').slice(0, 6).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '22px', color: '#94a3b8', fontSize: 12 }}>Sin entradas registradas aun.</div>
                ) : movimientos.filter(m => m.tipo === 'entrada').slice(0, 6).map((mov, idx) => (
                  <div key={mov.id} style={{ padding: '10px 12px', borderBottom: idx < 5 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#e5e7eb', color: '#374151', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>IN</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b' }}>{(mov.item as { nombre?: string })?.nombre || mov.item_id}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{mov.motivo}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#374151', fontSize: 12 }}>+{mov.cantidad}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{formatDate(mov.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL ÍTEM ──────────────────────────────────────────────────────── */}
      {showItemModal && editingItem && (
        <div style={modalOverlayStyle} onClick={e => { if (e.target === e.currentTarget) { setShowItemModal(false); setEditingItem(null); } }}>
          <div style={{ ...modalStyle, maxWidth: 700 }}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
                  {itemModalMode === 'create' ? 'Nuevo Item de Inventario' : `Editar: ${editingItem.nombre}`}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Completa la información del insumo odontológico.</p>
              </div>
              <button onClick={() => { setShowItemModal(false); setEditingItem(null); }} style={modalCloseStyle}>✕</button>
            </div>

            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
              {/* Nombre */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nombre del Ítem *</label>
                <input value={editingItem.nombre || ''} onChange={e => setEditingItem(p => ({ ...p, nombre: e.target.value }))} placeholder="ej: Resina Compuesta A2 — Filtek" style={inputStyle} />
              </div>
              {/* Categoría */}
              <div>
                <label style={labelStyle}>Categoría *</label>
                <select value={editingItem.categoria_id || ''} onChange={e => setEditingItem(p => ({ ...p, categoria_id: e.target.value }))} style={{ ...selectStyle, width: '100%', padding: '10px 12px' }}>
                  <option value="">— Selecciona —</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowCategoryPanel(v => !v)}
                    style={{ ...btnSecondaryStyle, padding: '6px 12px', fontSize: 12 }}
                  >
                    {showCategoryPanel ? 'Ocultar categorias' : `Ver categorias (${categorias.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoryPanel(true)}
                    style={{ ...btnPrimaryStyle, padding: '6px 12px', fontSize: 12 }}
                  >
                    Crear nueva
                  </button>
                </div>

                {showCategoryPanel && (
                  <div style={{ marginTop: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                      Categorias disponibles
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {categorias.length === 0 && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>No hay categorias disponibles.</span>
                      )}
                      {categorias.map(cat => (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setEditingItem(prev => ({ ...prev, categoria_id: cat.id }))}
                          style={{
                            border: editingItem.categoria_id === cat.id ? '1px solid #4b5563' : '1px solid #d1d5db',
                            background: editingItem.categoria_id === cat.id ? '#e5e7eb' : '#fff',
                            color: '#374151',
                            borderRadius: 999,
                            padding: '4px 10px',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          {cat.nombre}
                        </button>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                        Crear categoria personalizada
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                        <input
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          placeholder="Nombre de categoria"
                          style={{ ...inputStyle, padding: '8px 10px' }}
                        />
                        <input
                          value={newCategoryDescription}
                          onChange={e => setNewCategoryDescription(e.target.value)}
                          placeholder="Descripcion breve (opcional)"
                          style={{ ...inputStyle, padding: '8px 10px' }}
                        />
                        <button
                          type="button"
                          onClick={() => crearCategoriaDesdeFormulario(newCategoryName, newCategoryDescription)}
                          style={{ ...btnPrimaryStyle, padding: '8px 12px', fontSize: 12 }}
                        >
                          Crear
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                        Sugerencias rapidas (crear varias)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {CATEGORY_SUGGESTIONS.map(s => (
                          <button
                            type="button"
                            key={s.nombre}
                            onClick={() => crearCategoriaDesdeFormulario(s.nombre, s.descripcion)}
                            style={{ ...btnSecondaryStyle, padding: '5px 10px', fontSize: 11 }}
                          >
                            + {s.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>
                  Categorias sincronizadas automaticamente. Los implementos personalizados se registran libremente en esta pantalla.
                </p>
              </div>
              {/* Código */}
              <div>
                <label style={labelStyle}>Código Interno</label>
                <input value={editingItem.codigo_interno || ''} onChange={e => setEditingItem(p => ({ ...p, codigo_interno: e.target.value }))} placeholder="ej: MAT-RES-001" style={inputStyle} />
              </div>
              {/* Descripción */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Descripción</label>
                <textarea value={editingItem.descripcion || ''} onChange={e => setEditingItem(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción detallada del producto…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              {/* Unidad */}
              <div>
                <label style={labelStyle}>Unidad de Medida</label>
                <select value={editingItem.unidad || 'unidad'} onChange={e => setEditingItem(p => ({ ...p, unidad: e.target.value }))} style={{ ...selectStyle, width: '100%', padding: '10px 12px' }}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {/* Precio */}
              <div>
                <label style={labelStyle}>Precio Unitario (DOP)</label>
                <input type="number" min="0" step="0.01" value={editingItem.precio_unitario || ''} onChange={e => setEditingItem(p => ({ ...p, precio_unitario: parseFloat(e.target.value) || 0 }))} placeholder="0.00" style={inputStyle} />
              </div>
              {/* Stock actual */}
              <div>
                <label style={labelStyle}>Stock Actual</label>
                <input type="number" min="0" value={editingItem.stock_actual ?? ''} onChange={e => setEditingItem(p => ({ ...p, stock_actual: parseFloat(e.target.value) || 0 }))} placeholder="0" style={inputStyle} />
              </div>
              {/* Stock mínimo */}
              <div>
                <label style={labelStyle}>Stock Mínimo (alerta)</label>
                <input type="number" min="0" value={editingItem.stock_minimo ?? ''} onChange={e => setEditingItem(p => ({ ...p, stock_minimo: parseFloat(e.target.value) || 0 }))} placeholder="5" style={inputStyle} />
              </div>
              {/* Stock máximo */}
              <div>
                <label style={labelStyle}>Stock Máximo (capacidad)</label>
                <input type="number" min="0" value={editingItem.stock_maximo ?? ''} onChange={e => setEditingItem(p => ({ ...p, stock_maximo: parseFloat(e.target.value) || 0 }))} placeholder="100" style={inputStyle} />
              </div>
              {/* Proveedor */}
              <div>
                <label style={labelStyle}>Proveedor</label>
                <input value={editingItem.proveedor || ''} onChange={e => setEditingItem(p => ({ ...p, proveedor: e.target.value }))} placeholder="ej: Dentsply Sirona" style={inputStyle} />
              </div>
              {/* Ubicación */}
              <div>
                <label style={labelStyle}>Ubicación / Almacén</label>
                <input value={editingItem.ubicacion || ''} onChange={e => setEditingItem(p => ({ ...p, ubicacion: e.target.value }))} placeholder="ej: Estante A3 — Consultorio 1" style={inputStyle} />
              </div>
              {/* Lote */}
              <div>
                <label style={labelStyle}>Lote</label>
                <input value={editingItem.lote || ''} onChange={e => setEditingItem(p => ({ ...p, lote: e.target.value }))} placeholder="ej: LOTE-2024-001" style={inputStyle} />
              </div>
              {/* Vencimiento */}
              <div>
                <label style={labelStyle}>Fecha de Vencimiento</label>
                <input type="date" value={editingItem.fecha_vencimiento || ''} onChange={e => setEditingItem(p => ({ ...p, fecha_vencimiento: e.target.value || null }))} style={inputStyle} />
              </div>

              {/* Descuentos automáticos */}
              <div style={{ gridColumn: '1 / -1', background: '#f3f4f6', borderRadius: 10, padding: '16px 18px', border: '1px solid #d1d5db' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Descuento Automatico por Consulta</div>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>Cantidad que se descontará automáticamente del stock cada vez que se complete una consulta del tipo indicado.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ ...labelStyle, color: '#4b5563' }}>Descuento por Consulta General</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" min="0" step="0.1" value={editingItem.descuento_consulta_general ?? ''} onChange={e => setEditingItem(p => ({ ...p, descuento_consulta_general: parseFloat(e.target.value) || 0 }))} placeholder="0" style={{ ...inputStyle, flex: 1 }} />
                      <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{editingItem.unidad || 'unidad'}/consulta</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: '#6b7280' }}>Descuento por Consulta Ortodoncia</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" min="0" step="0.1" value={editingItem.descuento_consulta_ortodoncia ?? ''} onChange={e => setEditingItem(p => ({ ...p, descuento_consulta_ortodoncia: parseFloat(e.target.value) || 0 }))} placeholder="0" style={{ ...inputStyle, flex: 1 }} />
                      <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{editingItem.unidad || 'unidad'}/consulta</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="item-activo" checked={editingItem.activo !== false} onChange={e => setEditingItem(p => ({ ...p, activo: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <label htmlFor="item-activo" style={{ fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Ítem activo en inventario</label>
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowItemModal(false); setEditingItem(null); }} style={btnSecondaryStyle}>Cancelar</button>
              <button onClick={() => saveItem(editingItem)} style={btnPrimaryStyle}>
                {itemModalMode === 'create' ? 'Crear Item' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CSS ANIMATIONS ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── ESTILOS COMPARTIDOS ─────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '11px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  verticalAlign: 'middle',
  color: '#334155',
};

const selectStyle: React.CSSProperties = {
  padding: '9px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 9,
  fontSize: 13,
  color: '#1e293b',
  background: '#fff',
  cursor: 'pointer',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 9,
  fontSize: 13,
  color: '#1e293b',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#475569',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  padding: '9px 18px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
  boxShadow: '0 4px 12px rgba(51,65,85,0.25)',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#475569',
  border: '1.5px solid #e2e8f0',
  borderRadius: 9,
  padding: '9px 18px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const btnDangerStyle: React.CSSProperties = {
  background: '#e5e7eb',
  color: '#111827',
  border: '1.5px solid #cbd5e1',
  borderRadius: 9,
  padding: '9px 18px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.24)',
  width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
  overflow: 'hidden', border: '1px solid #e2e8f0',
};

const modalHeaderStyle: React.CSSProperties = {
  padding: '22px 28px 16px', borderBottom: '1px solid #f1f5f9',
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0,
};

const modalCloseStyle: React.CSSProperties = {
  background: '#f1f5f9', border: 'none', borderRadius: 8,
  width: 32, height: 32, cursor: 'pointer', fontSize: 14,
  color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 700, flexShrink: 0,
};

// ─── HOOK PÚBLICO: descuentar stock por consulta ──────────────────────────────
// Se exporta para ser llamado desde PatientContext al guardar una consulta.

export async function descontarStockPorConsulta(
  tipoConsulta: 'general' | 'ortodoncia',
  pacienteId?: string,
  consultaId?: string
): Promise<void> {
  try {
    const campoDescuento = tipoConsulta === 'general'
      ? 'descuento_consulta_general'
      : 'descuento_consulta_ortodoncia';

    // Obtener todos los ítems que tienen descuento > 0 para este tipo
    const { data: items, error } = await supabase
      .from('inventario_items')
      .select('id, nombre, unidad, stock_actual, stock_minimo, descuento_consulta_general, descuento_consulta_ortodoncia')
      .gt(campoDescuento, 0)
      .eq('activo', true);

    if (error || !items || items.length === 0) return;

    const ahora = new Date().toISOString();

    for (const item of items) {
      const descuento = tipoConsulta === 'general'
        ? Number(item.descuento_consulta_general)
        : Number(item.descuento_consulta_ortodoncia);

      if (descuento <= 0) continue;

      const stockAntes = Number(item.stock_actual);
      const stockDespues = Math.max(0, stockAntes - descuento);

      // Actualizar stock
      await supabase.from('inventario_items').update({
        stock_actual: stockDespues,
        updated_at: ahora,
      }).eq('id', item.id);

      // Registrar movimiento
      await supabase.from('movimientos_inventario').insert({
        item_id: item.id,
        tipo: 'descuento_consulta',
        cantidad: descuento,
        stock_antes: stockAntes,
        stock_despues: stockDespues,
        motivo: `Descuento automático — Consulta ${tipoConsulta === 'general' ? 'General' : 'Ortodoncia'}`,
        referencia: [pacienteId ? `Paciente: ${pacienteId}` : '', consultaId ? `Consulta: ${consultaId}` : ''].filter(Boolean).join(' | '),
        usuario: 'Sistema — Auto',
      });
    }
  } catch (err) {
    console.error('[InventoryHub] Error al descontar stock por consulta:', err);
  }
}
