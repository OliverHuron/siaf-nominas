// =====================================================
// COMPONENTE: Formulario de Inventario con Tabs y Validación Progresiva
// Archivo: client/src/pages/Inventory/InventoryForm.jsx
// Stack: React + React Hook Form + Zod + Tabs
// =====================================================

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaSave, FaTimes, FaCloudUploadAlt, FaImage } from 'react-icons/fa';
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
  estado_uso: z.enum(['bueno', 'regular', 'malo']).default('bueno'),
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
  
  // Tipo de inventario (Crucial para lógica condicional)
  tipo_inventario: z.string().optional().nullable(),
  
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
  
  // INTERNO Master Fields
  registro_patrimonial: z.string().optional().nullable(),
  registro_interno: z.string().optional().nullable(),
  elaboro_nombre: z.string().optional().nullable(),
  fecha_elaboracion: z.string().optional().nullable(),
  ures_asignacion: z.string().optional().nullable(),
  recurso: z.string().optional().nullable(),
  ur: z.string().optional().nullable(),
  ubicacion_id: z.union([z.number().int().positive(), z.null()]).optional(),
  responsable_entrega_id: z.union([z.number().int().positive(), z.null()]).optional(),
  numero_empleado: z.string().optional().nullable(),
  
  // EXTERNO Master Fields
  id_patrimonio: z.string().optional().nullable(),
  clave_patrimonial: z.string().optional().nullable(),
  numero_inventario: z.string().optional().nullable(),
  ures_gasto: z.string().optional().nullable(),
  ejercicio: z.string().optional().nullable(),
  solicitud_compra: z.string().optional().nullable(),
  idcon: z.string().optional().nullable(),
  usu_asig: z.string().optional().nullable(),
  fecha_registro: z.string().optional().nullable(),
  fecha_asignacion: z.string().optional().nullable(),
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
  // No validamos condicionalmente aquí con refine estricto porque los campos varían mucho
  // entre INTERNO y EXTERNO. Dejamos que los campos individuales con .min(1) hagan su trabajo
  // si son requeridos en el JSX.
}).superRefine((data, ctx) => {
  // Validación condicional para INTERNO
  if (data.tipo_inventario === 'INTERNO' && !data.coordinacion_id) {
    if (!data.marca) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Marca requerida para Interno", path: ['marca'] });
    if (!data.modelo) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modelo requerido para Interno", path: ['modelo'] });
    // tipo_bien y ubicacion tal vez no existen en Interno si se quitaron?
    // Revisar JSX de Interno.
  }
  
  // Validación para EXTERNO
  if (data.tipo_inventario === 'EXTERNO') {
    // Si hay campos obligatorios específicos de EXTERNO
  }
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
  const [activeInventoryTab, setActiveInventoryTab] = useState(initialData?.tipo_inventario || 'INTERNO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  
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
    resolver: zodResolver(inventorySchemaBase),
    defaultValues: {
      marca: initialData?.marca || '',
      modelo: initialData?.modelo || '',
      numero_serie: initialData?.numero_serie || '',
      numero_patrimonio: initialData?.numero_patrimonio || '',
      tipo_bien: initialData?.tipo_bien || '',
      ubicacion: initialData?.ubicacion || '',
      // Default a INTERNO si no existe, para activar validaciones
      tipo_inventario: initialData?.tipo_inventario || 'INTERNO',
      registro_patrimonial: initialData?.registro_patrimonial || '',
      registro_interno: initialData?.registro_interno || '',
      estado: initialData?.estado || 'buena',
      estado_uso: (() => {
        // Migración de valores antiguos a nuevos
        const oldValue = initialData?.estado_uso;
        const migration = {
          'operativo': 'bueno',
          'en_reparacion': 'regular',
          'resguardo_temporal': 'regular',
          'obsoleto': 'malo',
          'de_baja': 'malo'
        };
        return migration[oldValue] || oldValue || 'bueno';
      })(),
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
      // Nuevos campos INTERNO Master
      elaboro_nombre: initialData?.elaboro_nombre || '',
      fecha_elaboracion: initialData?.fecha_elaboracion || '',
      ures_asignacion: initialData?.ures_asignacion || '',
      recurso: initialData?.recurso || '',
      ur: initialData?.ur || '',
      ubicacion_id: initialData?.ubicacion_id || null, // ID para tabla normalizada
      responsable_entrega_id: initialData?.responsable_entrega_id || null, // ID para jerarquia
      // Nuevos campos EXTERNO Master
      id_patrimonio: initialData?.id_patrimonio || '',
      clave_patrimonial: initialData?.clave_patrimonial || '',
      numero_inventario: initialData?.numero_inventario || '',
      ures_gasto: initialData?.ures_gasto || '',
      ejercicio: initialData?.ejercicio || '',
      solicitud_compra: initialData?.solicitud_compra || '',
      idcon: initialData?.idcon || '',
      usu_asig: initialData?.usu_asig || '',
      fecha_registro: initialData?.fecha_registro || '',
      fecha_asignacion: initialData?.fecha_asignacion || '',
      numero_empleado: initialData?.numero_empleado || '', // Si es manual
      tipo_inventario: initialData?.tipo_inventario || 'INTERNO', // Default INTERNO
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
  // const datosGeneralesRequeridos = !hasCoordinacion; // Deprecated
  
  // const estatusValidacion = watch('estatus_validacion'); // Deprecated
  
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
        fecha_adquisicion: data.fecha_adquisicion || null,
      // Campos numéricos opcionales
        costo: (data.costo && !isNaN(Number(data.costo))) ? Number(data.costo) : null,
        garantia_meses: (data.garantia_meses && !isNaN(Number(data.garantia_meses))) ? Number(data.garantia_meses) : null,
        vida_util_anios: (data.vida_util_anios && !isNaN(Number(data.vida_util_anios))) ? Number(data.vida_util_anios) : 5,
        // Nuevos campos de patrimonio
        tipo_inventario: data.tipo_inventario || null,
        registro_patrimonial: data.registro_patrimonial || null,
        registro_interno: data.registro_interno || null,
        jerarquia_responsable: data.jerarquia_responsable || null, // Posiblemente obsoleto si usamos responsable_entrega_id
        ubicacion_especifica: data.ubicacion_especifica || null, // Obsoleto si usamos ubicacion_id? Prompt pide detalle A-2 etc.
        id_patrimonio: data.id_patrimonio || null,
        clave_patrimonial: data.clave_patrimonial || null,
        numero_inventario: data.numero_inventario || null,
        descripcion_bien: data.descripcion_bien || null,
        
        // Master INTERNO Fields
        elaboro_nombre: data.elaboro_nombre || null,
        fecha_elaboracion: data.fecha_elaboracion || null,
        ures_asignacion: data.ures_asignacion || null,
        recurso: data.recurso || null,
        ur: data.ur || null,
        ubicacion_id: data.ubicacion_id ? Number(data.ubicacion_id) : null,
        responsable_entrega_id: data.responsable_entrega_id ? Number(data.responsable_entrega_id) : null,
        
        // Master EXTERNO Fields
        ures_gasto: data.ures_gasto || null,
        ejercicio: data.ejercicio || null,
        solicitud_compra: data.solicitud_compra || null,
        idcon: data.idcon || null,
        usu_asig: data.usu_asig || null,
        fecha_registro: data.fecha_registro || null,
        fecha_asignacion: data.fecha_asignacion || null,
        // COG, Fondo, Cta x Pagar (ya estaban en baseFields pero aseguramos)
        cog: data.cog || null,
        fondo: data.fondo || null,
        cuenta_por_pagar: data.cuenta_por_pagar || null,
        numero_empleado: data.numero_empleado || null,
      };

      console.log('Datos limpiados:', cleanedData);
      console.log('🎯 coordinacion_id a enviar:', cleanedData.coordinacion_id, typeof cleanedData.coordinacion_id);
      
      // Si hay imágenes, usar FormData
      if (imageFiles.length > 0) {
        const formData = new FormData();

        // Si estamos actualizando y ya existen imágenes en initialData, envíalas para que el backend las concatene
        if (initialData?.imagenes && Array.isArray(initialData.imagenes) && initialData.imagenes.length > 0) {
          cleanedData.imagenes = initialData.imagenes;
        }

        // Agregar todos los campos como JSON string
        formData.append('data', JSON.stringify(cleanedData));

        // Agregar imágenes
        imageFiles.forEach((file, index) => {
          formData.append('imagenes', file);
        });

        console.log('📤 Enviando con imágenes (FormData)');
        console.log('imageFiles at submit:', imageFiles);
        // Debug: listar contenido de FormData (keys y tipos)
        for (const entry of formData.entries()) {
          console.log('FormData entry:', entry[0], entry[1]);
        }
        await onSubmit(formData);
      } else {
        // Sin imágenes, enviar JSON normal
        // Asegurarnos de no enviar objetos File como 'imagenes' en JSON
        if (cleanedData.imagenes && Array.isArray(cleanedData.imagenes)) {
          // Mantener sólo URLs/strings
          cleanedData.imagenes = cleanedData.imagenes.filter(i => typeof i === 'string');
        }

        console.log('📤 Enviando sin imágenes (JSON)');
        await onSubmit(cleanedData);
      }
      
    } catch (error) {
      console.error('❌ Error completo:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      alert('❌ Error al guardar el activo:\n' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inventory-form-container">
      {/* Header con Tabs */}
      <div className="form-header-with-tabs">
        <div className="form-header-top">
          <div className="form-title-section">
            <h2>{isEditMode ? 'Editar Activo' : 'Nuevo Activo de Inventario'}</h2>
            {initialData?.folio && (
              <span className="folio-badge">Folio: {initialData.folio}</span>
            )}
          </div>
        </div>
        
        {/* Tabs de navegación */}
        <div className="inventory-tabs">
          <button
            type="button"
            className={`inventory-tab ${activeInventoryTab === 'INTERNO' ? 'active' : ''}`}
            onClick={() => {
              setActiveInventoryTab('INTERNO');
              setValue('tipo_inventario', 'INTERNO');
            }}
          >
            <span className="tab-title">INTERNO</span>
          </button>
          <button
            type="button"
            className={`inventory-tab ${activeInventoryTab === 'EXTERNO' ? 'active' : ''}`}
            onClick={() => {
              setActiveInventoryTab('EXTERNO');
              setValue('tipo_inventario', 'EXTERNO');
            }}
          >
            <span className="tab-title">EXTERNO</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmitHandler)} className="inventory-form">
        
        <div className="form-content">
            <div>
            {hasCoordinacion && (
              <div className="info-banner">
                <span className="info-icon">ℹ️</span>
                <div className="info-content">
                  <strong>Modo: Envío a Coordinación</strong>
                  <p>
                    Completa <strong>tipo de bien, marca y modelo</strong> para que el coordinador identifique el equipo.
                    Los datos de serie/ubicación los llenará el coordinador al recibirlo.
                  </p>
                </div>
              </div>
            )}

            {/* =================================================================================
                INTERNO MASTER LIST
               ================================================================================= */}
            {activeInventoryTab === 'INTERNO' && (
              <div className="section-container">
                                
                {/* 2. Fotografía del bien (3) */}
                <div className="form-group mb-6">
                  <label className="input-label">2. Fotografía del bien (Máx. 3) *</label>
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      id="file-upload-interno"
                      accept="image/*"
                      multiple
                      className="hidden-input"
                      onChange={(e) => {
                        const files = Array.from(e.target.files).slice(0, 3);
                        setImageFiles(files);
                        const previews = files.map(file => URL.createObjectURL(file));
                        setImagePreviews(previews);
                      }}
                    />
                    <label htmlFor="file-upload-interno" className="custom-file-upload">
                      <FaCloudUploadAlt className="upload-icon" />
                      Elegir archivos
                    </label>
                    <span className="file-name-display">
                      {imageFiles.length > 0 
                        ? `${imageFiles.length} archivo(s) seleccionado(s)` 
                        : 'Sin archivos seleccionados'}
                    </span>
                  </div>
                  
                  {/* Previsualización de imágenes */}
                  {imagePreviews.length > 0 && (
                    <div className="image-previews-row">
                      {imagePreviews.map((src, index) => (
                        <div key={index} className="preview-thumb-container">
                          <img src={src} alt={`Preview ${index}`} className="preview-thumb" />
                        </div>
                      ))}
                    </div>
                  )}
                  {imageFiles.length === 0 && (
                    <div className="no-image-placeholder">
                      <FaImage /> <span>Vista previa</span>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  {/* 3. Numero de registro patrimonial */}
                  <div className="form-group">
                    <label>3. No. Registro Patrimonial</label>
                    <input type="text" {...register('registro_patrimonial')} className="form-control" />
                  </div>
                  {/* 4. No. De registro interno */}
                  <div className="form-group">
                    <label>4. No. Registro Interno</label>
                    <input type="text" {...register('registro_interno')} className="form-control" />
                  </div>
                </div>

                {/* 5. Descripción */}
                <div className="form-group">
                  <label>5. Descripción</label>
                  <textarea {...register('descripcion')} className="form-control" rows="2" />
                </div>


                {/* 6. Elaboro y Fecha Elaboración */}
                <div className="form-row">
                  <div className="form-group">
                    <label>6. Elaboró</label>
                    <input type="text" {...register('elaboro_nombre')} className="form-control" placeholder="Nombre de quien elabora" />
                  </div>
                  <div className="form-group">
                    <label>18. Fecha Elaboración</label>
                    <input type="date" {...register('fecha_elaboracion')} className="form-control" />
                  </div>
                </div>

                <div className="form-row">
                  {/* 7. Marca */}
                  <div className="form-group">
                    <label>7. Marca</label>
                    <input type="text" {...register('marca')} className="form-control" />
                  </div>
                  {/* 8. Modelo */}
                  <div className="form-group">
                    <label>8. Modelo</label>
                    <input type="text" {...register('modelo')} className="form-control" />
                  </div>
                  {/* 9. No. De serie */}
                  <div className="form-group">
                    <label>9. No. Serie</label>
                    <input type="text" {...register('numero_serie')} className="form-control" />
                  </div>
                </div>

                <div className="form-row">
                  {/* 10. No. Factura */}
                  <div className="form-group">
                    <label>10. No. Factura</label>
                    <input type="text" {...register('factura')} className="form-control" />
                  </div>
                  {/* 11. Fecha de Factura */}
                  <div className="form-group">
                    <label>11. Fecha Factura</label>
                    <input type="date" {...register('fecha_adquisicion')} className="form-control" />
                  </div>
                </div>

                {/* 12. UUID */}
                <div className="form-group">
                  <label>12. UUID (Folio Fiscal)</label>
                  <input type="text" {...register('uuid')} className="form-control" />
                </div>

                <div className="form-row">
                  {/* 13. Costo */}
                  <div className="form-group">
                    <label>13. Costo</label>
                    <input type="number" step="0.01" {...register('costo')} className="form-control" />
                  </div>
                  {/* 14. URES de Asignación */}
                  <div className="form-group">
                    <label>14. URES Asignación</label>
                    <input type="text" {...register('ures_asignacion')} className="form-control" />
                  </div>
                </div>

                {/* 15. Ubicación (Catalogo Normalizado) */}
                <div className="form-group">
                  <label>15. Ubicación (Edificio/Salón)</label>
                  <Controller
                    name="ubicacion_id"
                    control={control}
                    render={({ field }) => <UbicacionSelect {...field} />}
                  />
                </div>

                <div className="form-row">
                  {/* 16. Recurso */}
                  <div className="form-group">
                    <label>16. Recurso</label>
                    <input type="text" {...register('recurso')} className="form-control" />
                  </div>
                  {/* 17. Proveedor */}
                  <div className="form-group">
                    <label>17. Proveedor</label>
                    <input type="text" {...register('proveedor')} className="form-control" />
                  </div>
                </div>


                {/* 19. Observaciones */}
                <div className="form-group">
                  <label>19. Observaciones</label>
                  <textarea {...register('comentarios')} className="form-control" rows="2" />
                </div>

                {/* 20. Estado de Uso */}
                <div className="form-group">
                  <label>20. Estado de Uso</label>
                  <select {...register('estado_uso')} className="form-control">
                    <option value="bueno">Bueno</option>
                    <option value="regular">Regular</option>
                    <option value="malo">Malo</option>
                  </select>
                </div>

                {/* 21. ENTREGA Responsable (Jerarquía) */}
                <div className="form-group">
                  <label>21. ENTREGA Responsable (Jerarquía)</label>
                  <Controller
                    name="responsable_entrega_id"
                    control={control}
                    render={({ field }) => <JerarquiaSelect {...field} />}
                  />
                </div>

                {/* 22. Resguardante y 23. Numero de Empleado */}
                <div className="form-row">
                  <div className="form-group">
                    <label>22. Resguardante (Usuario)</label>
                    <Controller
                      name="usuario_asignado_id"
                      control={control}
                      render={({ field }) => <EmpleadoSelect {...field} />}
                    />
                  </div>
                  <div className="form-group">
                     <label>23. No. Empleado</label>
                     <input type="text" {...register('numero_empleado')} className="form-control" placeholder="Autocompletar si es posible" />
                  </div>
                </div>

                {/* 24. UR */}
                <div className="form-group">
                  <label>24. UR</label>
                  <input type="text" {...register('ur')} className="form-control" />
                </div>
              </div>
            )}


            {/* =================================================================================
                EXTERNO MASTER LIST
               ================================================================================= */}
            {activeInventoryTab === 'EXTERNO' && (
              <div className="section-container">
                  {/* Título eliminado: 🏛️ Inventario EXTERNO (Lista Maestra) */}

                 {/* 2. Id Patrimonio */}
                 <div className="form-group">
                   <label>2. ID Patrimonio</label>
                   <input type="text" {...register('id_patrimonio')} className="form-control" />
                 </div>

                 <div className="form-row">
                    {/* 3. Folio (usamos numero_patrimonio o inventario?) prompt dice Folio */}
                    <div className="form-group">
                       <label>3. Folio</label>
                       <input type="text" {...register('folio')} className="form-control" disabled placeholder="Automático" />
                    </div>
                    {/* 4. Clave Patrimonial */}
                    <div className="form-group">
                       <label>4. Clave Patrimonial</label>
                       <input type="text" {...register('clave_patrimonial')} className="form-control" />
                    </div>
                 </div>

                 {/* 5. Descripción */}
                 <div className="form-group">
                    <label>5. Descripción</label>
                    <textarea {...register('descripcion')} className="form-control" rows="2" />
                 </div>

                 {/* 6. Comentarios */}
                 <div className="form-group">
                    <label>6. Comentarios</label>
                    <textarea {...register('comentarios')} className="form-control" rows="2" />
                 </div>

                 {/* 7. ENTREGA Responsable (Jerarquía) */}
                 <div className="form-group">
                    <label>7. ENTREGA Responsable (Jerarquía)</label>
                    <Controller
                      name="responsable_entrega_id"
                      control={control}
                      render={({ field }) => <JerarquiaSelect {...field} />}
                    />
                 </div>

                 <div className="form-row">
                    {/* 8. U. Res. de Gasto */}
                    <div className="form-group">
                       <label>8. U. Res. de Gasto</label>
                       <input type="text" {...register('ures_gasto')} className="form-control" />
                    </div>
                    {/* 9. U. Res. De Asignación */}
                    <div className="form-group">
                       <label>9. U. Res. de Asignación</label>
                       <input type="text" {...register('ures_asignacion')} className="form-control" />
                    </div>
                 </div>

                 <div className="form-row">
                    {/* 10. Costo */}
                    <div className="form-group">
                       <label>10. Costo</label>
                       <input type="number" step="0.01" {...register('costo')} className="form-control" />
                    </div>
                    {/* 11. COG */}
                    <div className="form-group">
                       <label>11. COG</label>
                       <input type="text" {...register('cog')} className="form-control" />
                    </div>
                 </div>

                 {/* 12. Tipo de bien */}
                 <div className="form-group">
                    <label>12. Tipo de Bien</label>
                    <input type="text" {...register('tipo_bien')} className="form-control" />
                 </div>

                 <div className="form-row">
                    {/* 13. Num Fact */}
                    <div className="form-group">
                       <label>13. Num Factura</label>
                       <input type="text" {...register('factura')} className="form-control" />
                    </div>
                    {/* 14. Fec Factura */}
                    <div className="form-group">
                       <label>14. Fec Factura</label>
                       <input type="date" {...register('fecha_adquisicion')} className="form-control" />
                    </div>
                 </div>

                 <div className="form-row">
                    {/* 15. UUID */}
                    <div className="form-group">
                       <label>15. UUID</label>
                       <input type="text" {...register('uuid')} className="form-control" />
                    </div>
                    {/* 16. Fondo */}
                    <div className="form-group">
                       <label>16. Fondo</label>
                       <input type="text" {...register('fondo')} className="form-control" />
                    </div>
                 </div>

                 <div className="form-row">
                    {/* 17, 18 y 19 Eliminados para evitar conflicto con INTERNO */}
                    {/* Marca, Modelo y Serie se capturan en el bloque condicional si aplica, 
                        pero para EXTERNO Master parecen estar duplicados visualmente.
                        Si se requieren para externo, deben compartir el MISMO input visual 
                        o manejar lógica de renderizado condicional estricta (no solo display:none).
                        
                        Dado que el diseño visual de INTERNO ya tiene estos campos, 
                        y EXTERNO parece tener su propia estructura, 
                        asumiremos que estos campos NO deben duplicarse aquí si ya existen arriba.
                        
                        PERO: El bloque de arriba es para INTERNO. Este es para EXTERNO.
                        Si el usuario selecciona EXTERNO, el bloque de arriba se oculta (display:none).
                        Este bloque se muestra.
                        
                        EL PROBLEMA: react-hook-form registra AMBOS porque ambos están en el DOM.
                        SOLUCIÓN: Usar renderizado condicional ({activeInventoryTab === 'EXTERNO' && ...})
                        en lugar de display:none para asegurar que solo exista UN input en el DOM a la vez.
                    */}
                 </div>

                 {/* 20. Ejercicio */}
                 <div className="form-group">
                    <label>20. Ejercicio</label>
                    <input type="text" {...register('ejercicio')} className="form-control" />
                 </div>

                 <div className="form-row">
                    {/* 21. Solicitud/ord. Compra */}
                    <div className="form-group">
                       <label>21. Solicitud/Ord. Compra</label>
                       <input type="text" {...register('solicitud_compra')} className="form-control" />
                    </div>
                    {/* 22. Cuenta por pagar */}
                    <div className="form-group">
                       <label>22. Cuenta por Pagar</label>
                       <input type="text" {...register('cuenta_por_pagar')} className="form-control" />
                    </div>
                 </div>

                 <div className="form-row">
                    {/* 23. IDCON */}
                    <div className="form-group">
                       <label>23. IDCON</label>
                       <input type="text" {...register('idcon')} className="form-control" />
                    </div>
                    {/* 24. Proveedor */}
                    <div className="form-group">
                       <label>24. Proveedor</label>
                       <input type="text" {...register('proveedor')} className="form-control" />
                    </div>
                 </div>

                 {/* 25. Usu Asig */}
                 <div className="form-group">
                    <label>25. Usu Asig</label>
                    <input type="text" {...register('usu_asig')} className="form-control" />
                 </div>

                 <div className="form-row">
                    {/* 26. Fecha registro */}
                    <div className="form-group">
                       <label>26. Fecha Registro</label>
                       <input type="date" {...register('fecha_registro')} className="form-control" />
                    </div>
                    {/* 27. Fecha Asig */}
                    <div className="form-group">
                       <label>27. Fecha Asig</label>
                       <input type="date" {...register('fecha_asignacion')} className="form-control" />
                    </div>
                 </div>

                 {/* 28. Ubicación */}
                 <div className="form-group">
                    <label>28. Ubicación</label>
                    <Controller
                       name="ubicacion_id"
                       control={control}
                       render={({ field }) => <UbicacionSelect {...field} />}
                    />
                 </div>
                 
                 {/* 29. Estado de Uso */}
                 <div className="form-group">
                    <label>29. Estado de Uso</label>
                    <select {...register('estado_uso')} className="form-control">
                       <option value="operativo">Bueno</option>
                       <option value="regular">Regular</option>
                       <option value="malo">Malo</option>
                    </select>
                 </div>

                 {/* 30. Resguardante y 31. Num Empleado */}
                 <div className="form-row">
                    <div className="form-group">
                       <label>30. Resguardante (Usuario)</label>
                       <Controller
                          name="empleado_resguardante_id"
                          control={control}
                          render={({ field }) => <EmpleadoSelect {...field} />}
                       />
                    </div>
                    <div className="form-group">
                       <label>31. No. Empleado</label>
                       <input type="text" {...register('numero_empleado')} className="form-control" />
                    </div>
                 </div>
                 
                 {/* Fotos Externo (No estaba en lista explicita pero asumimos que tambien lleva) */}
                 <div className="form-group mb-6">
                   <label className="input-label">Fotografías Adicionales (Opcional)</label>
                   <div className="file-upload-wrapper">
                    <input
                      type="file"
                      id="file-upload-externo"
                      accept="image/*"
                      multiple
                      className="hidden-input"
                      onChange={(e) => {
                        const files = Array.from(e.target.files).slice(0, 3);
                        setImageFiles(files);
                        const previews = files.map(file => URL.createObjectURL(file));
                        setImagePreviews(previews);
                      }}
                    />
                    <label htmlFor="file-upload-externo" className="custom-file-upload">
                      <FaCloudUploadAlt className="upload-icon" />
                      Elegir archivos
                    </label>
                    <span className="file-name-display">
                      {imageFiles.length > 0 
                        ? `${imageFiles.length} archivo(s) seleccionado(s)` 
                        : 'Sin archivos seleccionados'}
                    </span>
                   </div>
                   
                   {imagePreviews.length > 0 && (
                    <div className="image-previews-row">
                      {imagePreviews.map((src, index) => (
                        <div key={index} className="preview-thumb-container">
                          <img src={src} alt={`Preview ${index}`} className="preview-thumb" />
                        </div>
                      ))}
                    </div>
                   )}
                 </div>
               </div>
           )}

            </div>
        </div>

        {/* Tabs de Asignación y Administrativa eliminados por estar incluidos en la Lista Maestra */}

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

const JerarquiaSelect = ({ value, onChange, disabled }) => {
  const [jerarquias, setJerarquias] = useState([]);
  
  useEffect(() => {
    api.get('/api/catalogs/jerarquias')
      .then(response => {
        // Usamos la lista plana para el select, pero con indentación visual
        const flatList = response.data.flat || [];
        setJerarquias(flatList);
      })
      .catch(err => console.error('Error cargando jerarquías:', err));
  }, []);
  
  return (
    <select 
      value={value || ''} 
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? parseInt(val, 10) : null);
      }}
      disabled={disabled}
      className="form-control"
      style={{ fontFamily: 'monospace' }} // Para que la indentación se vea bien
    >
      <option value="">Seleccione Responsable de Entrega...</option>
      {jerarquias.map(item => (
        <option key={item.id} value={item.id}>
         {/* Indentación visual basada en nivel */}
         {'\u00A0\u00A0'.repeat((item.nivel || 1) - 1)} 
         {item.codigo ? `${item.codigo} - ` : ''} {item.nombre}
        </option>
      ))}
    </select>
  );
};

const UbicacionSelect = ({ value, onChange, disabled }) => {
  const [ubicaciones, setUbicaciones] = useState([]);
  
  useEffect(() => {
    api.get('/api/catalogs/ubicaciones')
      .then(response => {
        setUbicaciones(response.data.flat || []);
      })
      .catch(err => console.error('Error cargando ubicaciones:', err));
  }, []);
  
  // Agrupar por edificio para mostrar optgroups
  const grouped = ubicaciones.reduce((acc, curr) => {
    const edificio = curr.edificio_nombre || 'Sin Edificio';
    if (!acc[edificio]) acc[edificio] = [];
    acc[edificio].push(curr);
    return acc;
  }, {});
  
  return (
    <select 
      value={value || ''} 
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? parseInt(val, 10) : null);
      }}
      disabled={disabled}
      className="form-control"
    >
      <option value="">Seleccione Ubicación...</option>
      {Object.entries(grouped).map(([edificio, locs]) => (
        <optgroup key={edificio} label={edificio}>
          {locs.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.nombre} {loc.piso ? `(${loc.piso})` : ''}
            </option>
          ))}
        </optgroup>
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
