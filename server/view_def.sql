 SELECT e.id AS empleado_id,
    e.nombre,
    e.apellido_paterno,
    e.apellido_materno,
    e.rfc,
    e.tipo,
    e.subtipo_administrativo,
    e.unidad_responsable,
    e.dependencia_id,
    d.nombre AS dependencia_nombre,
    cn.id AS concepto_id,
    cn.nombre AS concepto_nombre,
    ecn.activo AS concepto_activo,
    ecn.firmado,
    ecn.fecha_firma,
    ecn.periodo_aplicacion,
    ecn.observaciones
   FROM empleados e
     LEFT JOIN dependencias d ON e.dependencia_id = d.id
     LEFT JOIN empleado_concepto_nomina ecn ON e.id = ecn.empleado_id
     LEFT JOIN conceptos_nomina cn ON ecn.concepto_nomina_id = cn.id
  WHERE e.activo = true
  ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre, cn.nombre;