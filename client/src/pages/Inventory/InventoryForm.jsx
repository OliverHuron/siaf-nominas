// =====================================================
// COMPONENTE: Formulario de Inventario con Tabs y Validación Progresiva
// Archivo: client/src/pages/Inventory/InventoryForm.jsx
// Stack: React + React Hook Form + Zod + Tabs
// =====================================================

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaBox, FaUser, FaFileInvoiceDollar, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import './InventoryForm.css';

// =====================================================
// ESQUEMA DE VALIDACIÓN ZOD (Validación Progresiva)
// =====================================================

// Campos base comunes
const baseFields = {
  // TAB GENERAL - Datos Físicos
  numero_serie: z.string().nullable().optional(),
  numero_patrimonio: z.string().nullable().optional(),
  estado: z.enum(['buena', 'regular', 'mala']).default('buena'),
  estado_uso: z.enum(['operativo', 'en_reparacion', 'de_baja', 'obsoleto', 'resguardo_temporal']).default('operativo'),
  descripcion: z.string().optional(),
  comentarios: z.string().optional(),
  
  // TAB ASIGNACIÓN - Responsables
  dependencia_id: z.number().int().positive().optional().default(1),
  coordinacion_id: z.union([z.number().int().positive(), z.null()]).optional(),
  empleado_resguardante_id: z.union([z.number().int().positive(), z.null()]).optional(),
  usuario_asignado_id: z.union([z.number().int().positive(), z.null()]).optional(),
  numero_resguardo_interno: z.string().optional(),
  
  // Flags de inventario
  es_oficial_siia: z.boolean().optional().default(false),
  es_local: z.boolean().optional().default(true),
  es_investigacion: z.boolean().optional().default(false),
  
  // Estado del workflow
  estatus_validacion: z.enum(['borrador', 'revision', 'validado', 'rechazado']).optional().default('borrador'),
  
  // TAB ADMINISTRATIVA - Datos Fiscales
  costo: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val))) ? null : Number(val),
    z.number().positive().nullable().optional()
  ),
  cog: z.string().optional(),
  uuid: z.string().optional(),
  factura: z.string().optional(),
  fondo: z.string().optional(),
  cuenta_por_pagar: z.string().optional(),
  fecha_adquisicion: z.string().nullable().optional(),
  proveedor: z.string().optional(),
  garantia_meses: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val))) ? null : Number(val),
    z.number().int().positive().nullable().optional()
  ),
  vida_util_anios: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val))) ? 5 : Number(val),
    z.number().int().positive().nullable().optional()
  ),
};

// Esquema para Admin enviando a coordinación (datos físicos NO requeridos)
const inventorySchemaAdminEnvio = z.object({
  ...baseFields,
  marca: z.string().optional(),
  modelo: z.string().optional(),
  tipo_bien: z.string().optional(),
  ubicacion: z.string().optional(),
});

// Esquema para Coordinador creando físico (datos físicos SÍ requeridos)
const inventorySchemaCoordinador = z.object({
  ...baseFields,
  marca: z.string().min(1, 'Marca requerida'),
  modelo: z.string().min(1, 'Modelo requerido'),
  tipo_bien: z.string().min(1, 'Tipo de bien requerido'),
  ubicacion: z.string().min(1, 'Ubicación requerida'),
});

// Esquema base flexible - usa refine para decidir dinámicamente
const inventorySchemaBase = z.object({
  ...baseFields,
  marca: z.string().optional(),
  modelo: z.string().optional(),
  tipo_bien: z.string().optional(),
  ubicacion: z.string().optional(),
}).refine((data) => {
  // Si NO hay coordinacion_id, entonces es creación física por coordinador
  // y necesita todos los datos físicos
  if (!data.coordinacion_id) {
    return !!(data.marca && data.modelo && data.tipo_bien && data.ubicacion);
  }
  // Si hay coordinacion_id, es creación fiscal por admin
  // y NO necesita datos físicos todavía
  return true;
}, {
  message: 'Si no asignas coordinación, debes completar marca, modelo, tipo de bien y ubicación',
  path: ['marca']
});

// Esquema para validación cuando se marca como "validado" (sin usar .extend())
const inventorySchemaValidado = z.object({
  ...baseFields,
  marca: z.string().min(1, 'Marca requerida'),
  modelo: z.string().min(1, 'Modelo requerido'),
  tipo_bien: z.string().min(1, 'Tipo de bien requerido'),
  ubicacion: z.string().min(1, 'Ubicación requerida'),
  costo: z.number().positive('Costo requerido para validar'),
  uuid: z.string().min(1, 'UUID requerido para validar'),
  factura: z.string().min(1, 'Factura requerida para validar'),
});

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const InventoryForm = ({ 
  initialData = null, 
  onSubmit, 
  onCancel, 
  userRole = 'coordinador', // 'admin', 'coordinador', 'usuario'
  userCoordinacionId = null // ID de coordinación del usuario logueado
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Determinar si se debe usar validación estricta
  const isAdmin = userRole === 'admin';
  const isEditMode = !!initialData;
  
  // Si es coordinador sin coordinacion_id en initialData, usar la del usuario
  const defaultCoordinacionId = isEditMode 
    ? initialData?.coordinacion_id 
    : (isAdmin ? null : userCoordinacionId);
  
  // Seleccionar esquema de validación según estatus
  const getValidationSchema = (data) => {
    if (data?.estatus_validacion === 'validado') {
      return inventorySchemaValidado;
    }
    return inventorySchemaBase;
  };
  
  const { 
    register, 
    handleSubmit, 
    control,
    watch,
    formState: { errors },
    setValue,
    reset,
    setError,
    clearErrors
  } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      marca: initialData?.marca || '',
      modelo: initialData?.modelo || '',
      numero_serie: initialData?.numero_serie || '',
      numero_patrimonio: initialData?.numero_patrimonio || '',
      tipo_bien: initialData?.tipo_bien || '',
      ubicacion: initialData?.ubicacion || '',
      estado: initialData?.estado || 'buena',
      estado_uso: initialData?.estado_uso || 'operativo',
      descripcion: initialData?.descripcion || '',
      comentarios: initialData?.comentarios || '',
      dependencia_id: initialData?.dependencia_id || 1,
      coordinacion_id: defaultCoordinacionId,
      empleado_resguardante_id: initialData?.empleado_resguardante_id || null,
      usuario_asignado_id: initialData?.usuario_asignado_id || null,
      numero_resguardo_interno: initialData?.numero_resguardo_interno || '',
      es_oficial_siia: initialData?.es_oficial_siia || false,
      es_local: initialData?.es_local !== undefined ? initialData.es_local : true,
      es_investigacion: initialData?.es_investigacion || false,
      estatus_validacion: initialData?.estatus_validacion || 'borrador',
      costo: initialData?.costo || null,
      cog: initialData?.cog || '',
      uuid: initialData?.uuid || '',
      factura: initialData?.factura || '',
      fondo: initialData?.fondo || '',
      cuenta_por_pagar: initialData?.cuenta_por_pagar || '',
      fecha_adquisicion: initialData?.fecha_adquisicion || '',
      proveedor: initialData?.proveedor || '',
      garantia_meses: initialData?.garantia_meses || null,
      vida_util_anios: initialData?.vida_util_anios || 5,
    }
  });

  // Para coordinadores, asegurar que coordinacion_id siempre sea la del usuario
  useEffect(() => {
    if (!isAdmin && userCoordinacionId) {
      setValue('coordinacion_id', userCoordinacionId);
    }
  }, [isAdmin, userCoordinacionId, setValue]);
  
  // Observar coordinacion_id para determinar qué campos son requeridos (DESPUÉS de useForm)
  const coordinacionIdValue = watch('coordinacion_id');
  const hasCoordinacion = !!coordinacionIdValue;
  
  // Si hay coordinación, los datos físicos NO son requeridos (Admin → Coordinador)
  // Si NO hay coordinación, los datos físicos SÍ son requeridos (Coordinador creando)
  const datosGeneralesRequeridos = !hasCoordinacion;
  
  const estatusValidacion = watch('estatus_validacion');
  
  // Debug: Mostrar errores de validación
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error('❌ Errores de validación en el formulario:', errors);
    }
  }, [errors]);
  
  // Validar antes de submit según el estatus
  const onSubmitHandler = async (data) => {
    console.log('🚀 onSubmitHandler ejecutándose...');
    clearErrors(); // Limpiar errores previos
    
    try {
      setIsSubmitting(true);
      
      console.log('Datos del formulario antes de procesar:', data);
      
      // NO validar con Zod - dejar que el backend valide
      // Solo limpiar y transformar los datos
      const cleanedData = {
        ...data,
        // IDs numéricos: convertir a number o null
        dependencia_id: data.dependencia_id ? Number(data.dependencia_id) : 1,
        coordinacion_id: data.coordinacion_id ? Number(data.coordinacion_id) : null,
        empleado_resguardante_id: data.empleado_resguardante_id ? Number(data.empleado_resguardante_id) : null,
        usuario_asignado_id: data.usuario_asignado_id ? Number(data.usuario_asignado_id) : null,
        // Campos de texto opcionales: convertir undefined a null
        numero_serie: data.numero_serie || null,
        numero_patrimonio: data.numero_patrimonio || null,
        descripcion: data.descripcion || null,
        comentarios: data.comentarios || null,
        numero_resguardo_interno: data.numero_resguardo_interno || null,
        marca: data.marca || null,
        modelo: data.modelo || null,
        tipo_bien: data.tipo_bien || null,
        ubicacion: data.ubicacion || null,
        // Mapear nombres de campos fiscales al formato del backend
        uuid_factura: data.uuid || null,
        numero_factura: data.factura || null,
        fecha_compra: data.fecha_adquisicion || null,
        // Campos numéricos opcionales
        costo: (data.costo && !isNaN(Number(data.costo))) ? Number(data.costo) : null,
        garantia_meses: (data.garantia_meses && !isNaN(Number(data.garantia_meses))) ? Number(data.garantia_meses) : null,
        vida_util_anios: (data.vida_util_anios && !isNaN(Number(data.vida_util_anios))) ? Number(data.vida_util_anios) : 5,
      };
      
      console.log('Datos limpiados:', cleanedData);
      console.log('🎯 coordinacion_id a enviar:', cleanedData.coordinacion_id, typeof cleanedData.coordinacion_id);
      
      // Enviar datos - el backend se encargará de la validación
      await onSubmit(cleanedData);
      
    } catch (error) {
      console.error('❌ Error completo:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      alert('❌ Error al guardar el activo:\n' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Tabs disponibles (filtrados por rol)
  const tabs = [
    { id: 'general', label: 'Datos Generales', icon: <FaBox />, visible: true },
    { id: 'asignacion', label: 'Asignación', icon: <FaUser />, visible: true },
    { id: 'administrativa', label: 'Información Administrativa', icon: <FaFileInvoiceDollar />, visible: isAdmin }
  ].filter(tab => tab.visible);
  
  return (
    <div className="inventory-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Editar Activo' : 'Nuevo Activo de Inventario'}</h2>
        {initialData?.folio && (
          <span className="folio-badge">Folio: {initialData.folio}</span>
        )}
      </div>
      
      {/* TABS */}
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      <form onSubmit={handleSubmit(onSubmitHandler)} className="inventory-form">
        
        {/* TAB 1: DATOS GENERALES */}
        {activeTab === 'general' && (
          <div className="tab-content">
            {hasCoordinacion && (
              <div style={{
                background: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '20px' }}>ℹ️</span>
                <div>
                  <strong>Modo: Envío a Coordinación</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#555' }}>
                    Completa <strong>tipo de bien, marca y modelo</strong> para que el coordinador identifique el equipo.
                    Los datos de serie/ubicación los llenará el coordinador al recibirlo.
                  </p>
                </div>
              </div>
            )}
            <h3>Identificación del Activo</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Tipo de Bien
                  {hasCoordinacion && (
                    <span style={{
                      padding: '3px 10px',
                      background: '#3498db',
                      color: 'white',
                      fontSize: '10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Requerido</span>
                  )}
                </label>
                <input
                  type="text"
                  {...register('tipo_bien')}
                  className="form-control"
                  placeholder="Ej: Computadora, Impresora, Mobiliario"
                />
                {errors.tipo_bien && <span className="error">{errors.tipo_bien.message}</span>}
              </div>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Marca
                  {hasCoordinacion && (
                    <span style={{
                      padding: '3px 10px',
                      background: '#3498db',
                      color: 'white',
                      fontSize: '10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Requerido</span>
                  )}
                </label>
                <input
                  type="text"
                  {...register('marca')}
                  className="form-control"
                  placeholder="Ej: HP, Dell, Lenovo"
                />
                {errors.marca && <span className="error">{errors.marca.message}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Modelo
                  {hasCoordinacion && (
                    <span style={{
                      padding: '3px 10px',
                      background: '#3498db',
                      color: 'white',
                      fontSize: '10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Requerido</span>
                  )}
                </label>
                <input
                  type="text"
                  {...register('modelo')}
                  className="form-control"
                  placeholder="Ej: Optiplex 7090, LaserJet Pro"
                />
                {errors.modelo && <span className="error">{errors.modelo.message}</span>}
              </div>
              
              <div className="form-group">
                <label>Número de Serie</label>
                <input
                  type="text"
                  {...register('numero_serie')}
                  className="form-control"
                  placeholder="Serie del fabricante"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Número de Patrimonio</label>
                <input
                  type="text"
                  {...register('numero_patrimonio')}
                  className="form-control"
                  placeholder="Número de activo fijo"
                />
              </div>
              
              <div className="form-group">
                <label>
                  Ubicación 
                  {datosGeneralesRequeridos && <span className="required">*</span>}
                </label>
                <input
                  type="text"
                  {...register('ubicacion')}
                  className="form-control"
                  placeholder="Ej: Edificio A, Oficina 201"
                />
                {errors.ubicacion && <span className="error">{errors.ubicacion.message}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Estado Físico</label>
                <select {...register('estado')} className="form-control">
                  <option value="buena">Buena</option>
                  <option value="regular">Regular</option>
                  <option value="mala">Mala</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Estado de Uso</label>
                <select {...register('estado_uso')} className="form-control">
                  <option value="operativo">Operativo</option>
                  <option value="en_reparacion">En Reparación</option>
                  <option value="resguardo_temporal">Resguardo Temporal</option>
                  <option value="obsoleto">Obsoleto</option>
                  <option value="de_baja">De Baja</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Descripción Técnica</label>
              <textarea
                {...register('descripcion')}
                className="form-control"
                rows="3"
                placeholder="Especificaciones técnicas, características relevantes..."
              />
            </div>
            
            <div className="form-group">
              <label>Comentarios / Observaciones</label>
              <textarea
                {...register('comentarios')}
                className="form-control"
                rows="2"
                placeholder="Notas adicionales, historial, etc."
              />
            </div>
            
            <h3>Tipo de Inventario</h3>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" {...register('es_oficial_siia')} />
                <span>Inventario Oficial SIIA</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" {...register('es_local')} />
                <span>Inventario Local</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" {...register('es_investigacion')} />
                <span>Inventario de Investigación</span>
              </label>
            </div>
          </div>
        )}
        
        {/* TAB 2: ASIGNACIÓN */}
        {activeTab === 'asignacion' && (
          <div className="tab-content">
            <h3>Asignación y Responsables</h3>
            
            <div className="form-group">
              <label>Coordinación</label>
              <Controller
                name="coordinacion_id"
                control={control}
                render={({ field }) => {
                  console.log('Coordinación field value:', field.value);
                  return (
                    <>
                      <CoordinacionSelect 
                        value={field.value}
                        onChange={(val) => {
                          console.log('Coordinación onChange:', val);
                          field.onChange(val);
                        }}
                        disabled={!isAdmin} // Solo admin puede cambiar coordinación
                        userCoordinacionId={userCoordinacionId}
                      />
                      {/* Hidden input para asegurar que el valor se envíe aunque esté disabled */}
                      {!isAdmin && field.value && (
                        <input type="hidden" value={field.value} />
                      )}
                    </>
                  );
                }}
              />
              {errors.coordinacion_id && <span className="error">{errors.coordinacion_id.message}</span>}
            </div>
            <div className="form-group">
              <label>Empleado Resguardante</label>
              <Controller
                name="empleado_resguardante_id"
                control={control}
                render={({ field }) => {
                  console.log('Empleado Resguardante field value:', field.value);
                  return (
                    <EmpleadoSelect 
                      value={field.value}
                      onChange={(val) => {
                        console.log('Empleado Resguardante onChange:', val);
                        field.onChange(val);
                      }}
                    />
                  );
                }}
              />
            </div>
            
            <div className="form-group">
              <label>Usuario Asignado (Sistema)</label>
              <Controller
                name="usuario_asignado_id"
                control={control}
                render={({ field }) => {
                  console.log('Usuario Asignado field value:', field.value);
                  return (
                    <UsuarioSelect 
                      value={field.value}
                      onChange={(val) => {
                        console.log('Usuario Asignado onChange:', val);
                        field.onChange(val);
                      }}
                    />
                  );
                }}
              />
            </div>
            
            <div className="form-group">
              <label>Número de Resguardo Interno</label>
              <input
                type="text"
                {...register('numero_resguardo_interno')}
                className="form-control"
                placeholder="Número de control interno"
              />
            </div>
            
            <div className="form-group">
              <label>Estado de Validación</label>
              <select {...register('estatus_validacion')} className="form-control">
                <option value="borrador">Borrador</option>
                <option value="revision">En Revisión</option>
                {isAdmin && <option value="validado">Validado</option>}
                {isAdmin && <option value="rechazado">Rechazado</option>}
              </select>
              <small className="help-text">
                {estatusValidacion === 'validado' && '⚠️ Al marcar como validado, los datos fiscales serán obligatorios'}
              </small>
            </div>
          </div>
        )}
        
        {/* TAB 3: ADMINISTRATIVA (Solo Admin) */}
        {activeTab === 'administrativa' && isAdmin && (
          <div className="tab-content">
            <div className="admin-warning">
              <FaFileInvoiceDollar />
              <p>Esta información es confidencial y solo visible para administradores.</p>
            </div>
            
            <h3>Datos Fiscales</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  Costo de Adquisición 
                  {estatusValidacion === 'validado' && <span className="required">*</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('costo', { valueAsNumber: true })}
                  className="form-control"
                  placeholder="0.00"
                />
                {errors.costo && <span className="error">{errors.costo.message}</span>}
              </div>
              
              <div className="form-group">
                <label>COG (Clave Presupuestal)</label>
                <input
                  type="text"
                  {...register('cog')}
                  className="form-control"
                  placeholder="Ej: 5151"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  UUID (Factura Electrónica)
                  {estatusValidacion === 'validado' && <span className="required">*</span>}
                </label>
                <input
                  type="text"
                  {...register('uuid')}
                  className="form-control"
                  placeholder="UUID del CFDI"
                />
                {errors.uuid && <span className="error">{errors.uuid.message}</span>}
              </div>
              
              <div className="form-group">
                <label>
                  Número de Factura
                  {estatusValidacion === 'validado' && <span className="required">*</span>}
                </label>
                <input
                  type="text"
                  {...register('factura')}
                  className="form-control"
                  placeholder="Folio fiscal"
                />
                {errors.factura && <span className="error">{errors.factura.message}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Fondo</label>
                <input
                  type="text"
                  {...register('fondo')}
                  className="form-control"
                  placeholder="Ej: FONE, PRODEP"
                />
              </div>
              
              <div className="form-group">
                <label>Cuenta por Pagar</label>
                <input
                  type="text"
                  {...register('cuenta_por_pagar')}
                  className="form-control"
                  placeholder="Número de cuenta"
                />
              </div>
            </div>
            
            <h3>Información Complementaria</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Fecha de Adquisición</label>
                <input
                  type="date"
                  {...register('fecha_adquisicion')}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>Proveedor</label>
                <input
                  type="text"
                  {...register('proveedor')}
                  className="form-control"
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Garantía (Meses)</label>
                <input
                  type="number"
                  {...register('garantia_meses', { valueAsNumber: true })}
                  className="form-control"
                  placeholder="12"
                />
              </div>
              
              <div className="form-group">
                <label>Vida Útil (Años)</label>
                <input
                  type="number"
                  {...register('vida_util_anios', { valueAsNumber: true })}
                  className="form-control"
                  placeholder="5"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* BOTONES DE ACCIÓN */}
        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn-cancel"
            disabled={isSubmitting}
          >
            <FaTimes />
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isSubmitting}
          >
            <FaSave />
            {isSubmitting ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Guardar')}
          </button>
        </div>
      </form>
    </div>
  );
};

// =====================================================
// COMPONENTES AUXILIARES (Select Dinámicos)
// =====================================================

const CoordinacionSelect = ({ value, onChange, disabled, userCoordinacionId }) => {
  const [coordinaciones, setCoordinaciones] = useState([]);
  
  useEffect(() => {
    // Fetch coordinaciones from API con autenticación
    api.get('/api/coordinaciones')
      .then(response => {
        console.log('Coordinaciones cargadas:', response.data);
        const coords = response.data.data || [];
        setCoordinaciones(coords);
      })
      .catch(err => console.error('Error cargando coordinaciones:', err));
  }, []);
  
  // El valor real viene del formulario (React Hook Form)
  const effectiveValue = value || '';
  
  return (
    <select 
      value={effectiveValue} 
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? parseInt(val, 10) : null);
      }}
      className={`form-control ${disabled ? 'select-readonly' : ''}`}
      disabled={disabled}
      style={disabled ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
    >
      <option value="">Seleccionar coordinación...</option>
      {coordinaciones.map(coord => (
        <option key={coord.id} value={coord.id}>
          {coord.nombre}
        </option>
      ))}
    </select>
  );
};

const EmpleadoSelect = ({ value, onChange }) => {
  const [usuarios, setUsuarios] = useState([]);
  
  useEffect(() => {
    // Usar usuarios en lugar de empleados con autenticación
    api.get('/api/users')
      .then(response => {
        console.log('Usuarios para resguardante:', response.data);
        setUsuarios(response.data.data || []);
      })
      .catch(err => console.error('Error cargando usuarios:', err));
  }, []);
  
  return (
    <select 
      value={value || ''} 
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? parseInt(val, 10) : null);
      }}
      className="form-control"
    >
      <option value="">Sin asignar</option>
      {usuarios.map(user => (
        <option key={user.id} value={user.id}>
          {user.nombre} {user.apellido_paterno} {user.apellido_materno || ''} ({user.rfc || 'Sin RFC'})
        </option>
      ))}
    </select>
  );
};

const UsuarioSelect = ({ value, onChange }) => {
  const [usuarios, setUsuarios] = useState([]);
  
  useEffect(() => {
    // Usar api con autenticación
    api.get('/api/users')
      .then(response => {
        console.log('Usuarios cargados:', response.data);
        setUsuarios(response.data.data || []);
      })
      .catch(err => console.error('Error cargando usuarios:', err));
  }, []);
  
  return (
    <select 
      value={value || ''} 
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? parseInt(val, 10) : null);
      }}
      className="form-control"
    >
      <option value="">Sin asignar</option>
      {usuarios.map(user => (
        <option key={user.id} value={user.id}>
          {user.nombre} {user.apellido_paterno} {user.apellido_materno || ''} - {user.email}
        </option>
      ))}
    </select>
  );
};

export default InventoryForm;

// =====================================================
// ESTILOS CSS (InventoryForm.css)
// =====================================================

/*
.inventory-form-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.folio-badge {
  background: #3b82f6;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s;
}

.tab:hover {
  color: #1e293b;
  background: #f8fafc;
}

.tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: #eff6ff;
}

.tab-content {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 500;
  color: #475569;
  margin-bottom: 6px;
  font-size: 14px;
}

.required {
  color: #dc2626;
  margin-left: 4px;
}

.error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
}

.help-text {
  color: #64748b;
  font-size: 12px;
  margin-top: 4px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.admin-warning {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  color: #92400e;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #e2e8f0;
}

.btn-cancel, .btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-cancel:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-cancel:disabled, .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .tabs-container {
    overflow-x: auto;
  }
}
*/
