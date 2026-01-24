const pool = require('../config/database');

class EmailTemplateController {
  // Obtener todas las plantillas
  getTemplates = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM email_templates 
        ORDER BY created_at DESC
      `);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo plantillas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo plantillas'
      });
    }
  };

  // Crear nueva plantilla
  createTemplate = async (req, res) => {
    try {
      const { name, subject, message, variables } = req.body;
      
      if (!name || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, asunto y mensaje son requeridos'
        });
      }

      const result = await pool.query(`
        INSERT INTO email_templates (name, subject, message, variables)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, subject, message, JSON.stringify(variables || [])]);

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Plantilla creada exitosamente'
      });
    } catch (error) {
      console.error('Error creando plantilla:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando plantilla'
      });
    }
  };

  // Actualizar plantilla
  updateTemplate = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, subject, message, variables } = req.body;

      const result = await pool.query(`
        UPDATE email_templates 
        SET name = $1, subject = $2, message = $3, variables = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [name, subject, message, JSON.stringify(variables || []), id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plantilla no encontrada'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Plantilla actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error actualizando plantilla:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando plantilla'
      });
    }
  };

  // Eliminar plantilla
  deleteTemplate = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        DELETE FROM email_templates 
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plantilla no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Plantilla eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando plantilla'
      });
    }
  };

  // Obtener empleados elegibles (activos sin faltas)
  getEligibleEmployees = async (req, res) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      // Consulta compleja para obtener empleados activos sin faltas en el año
      const result = await pool.query(`
        WITH employee_faults AS (
          SELECT 
            empleado_id,
            COUNT(*) as total_faults
          FROM asistencias_quincenales aq
          WHERE 
            anio = $1
            AND (
              enero_q1 = 'F' OR enero_q2 = 'F' OR
              febrero_q1 = 'F' OR febrero_q2 = 'F' OR
              marzo_q1 = 'F' OR marzo_q2 = 'F' OR
              abril_q1 = 'F' OR abril_q2 = 'F' OR
              mayo_q1 = 'F' OR mayo_q2 = 'F' OR
              junio_q1 = 'F' OR junio_q2 = 'F' OR
              julio_q1 = 'F' OR julio_q2 = 'F' OR
              agosto_q1 = 'F' OR agosto_q2 = 'F' OR
              septiembre_q1 = 'F' OR septiembre_q2 = 'F' OR
              octubre_q1 = 'F' OR octubre_q2 = 'F' OR
              noviembre_q1 = 'F' OR noviembre_q2 = 'F' OR
              diciembre_q1 = 'F' OR diciembre_q2 = 'F'
            )
          GROUP BY empleado_id
        )
        SELECT 
          e.id,
          e.nombre,
          e.apellido_paterno,
          e.apellido_materno,
          e.email,
          e.puesto,
          d.nombre as dependencia,
          COALESCE(ef.total_faults, 0) as total_faults
        FROM empleados e
        LEFT JOIN dependencias d ON e.dependencia_id = d.id
        LEFT JOIN employee_faults ef ON e.id = ef.empleado_id
        WHERE 
          e.activo = true 
          AND e.email IS NOT NULL 
          AND e.email != ''
          AND COALESCE(ef.total_faults, 0) = 0
        ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre
      `, [year]);

      // También obtener todos los empleados activos para comparación
      const allActiveResult = await pool.query(`
        SELECT 
          e.id,
          e.nombre,
          e.apellido_paterno,
          e.apellido_materno,
          e.email,
          e.puesto,
          d.nombre as dependencia
        FROM empleados e
        LEFT JOIN dependencias d ON e.dependencia_id = d.id
        WHERE 
          e.activo = true 
          AND e.email IS NOT NULL 
          AND e.email != ''
        ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre
      `);

      res.json({
        success: true,
        data: {
          eligibleEmployees: result.rows,
          allActiveEmployees: allActiveResult.rows,
          stats: {
            eligible: result.rows.length,
            totalActive: allActiveResult.rows.length,
            excluded: allActiveResult.rows.length - result.rows.length
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo empleados elegibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo empleados elegibles'
      });
    }
  };

  // Procesar variables en plantilla
  processTemplate = (template, variables) => {
    let processedSubject = template.subject;
    let processedMessage = template.message;

    // Reemplazar variables en asunto y mensaje
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      processedSubject = processedSubject.replace(regex, variables[key]);
      processedMessage = processedMessage.replace(regex, variables[key]);
    });

    return {
      subject: processedSubject,
      message: processedMessage
    };
  };

  // Previsualizar plantilla con variables
  previewTemplate = async (req, res) => {
    try {
      const { templateId, employeeId } = req.body;

      // Obtener plantilla
      const templateResult = await pool.query(`
        SELECT * FROM email_templates WHERE id = $1
      `, [templateId]);

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plantilla no encontrada'
        });
      }

      // Obtener datos del empleado
      const employeeResult = await pool.query(`
        SELECT 
          e.*,
          d.nombre as dependencia
        FROM empleados e
        LEFT JOIN dependencias d ON e.dependencia_id = d.id
        WHERE e.id = $1
      `, [employeeId]);

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Empleado no encontrado'
        });
      }

      const template = templateResult.rows[0];
      const employee = employeeResult.rows[0];

      // Variables disponibles
      const variables = {
        nombre: employee.nombre,
        apellido_paterno: employee.apellido_paterno,
        apellido_materno: employee.apellido_materno || '',
        nombre_completo: `${employee.nombre} ${employee.apellido_paterno} ${employee.apellido_materno || ''}`.trim(),
        email: employee.email,
        puesto: employee.puesto || '',
        dependencia: employee.dependencia || '',
        fecha_actual: new Date().toLocaleDateString('es-ES'),
        año_actual: new Date().getFullYear()
      };

      const processed = this.processTemplate(template, variables);

      res.json({
        success: true,
        data: {
          originalTemplate: template,
          processedTemplate: processed,
          employee: employee,
          availableVariables: Object.keys(variables)
        }
      });
    } catch (error) {
      console.error('Error previsualizando plantilla:', error);
      res.status(500).json({
        success: false,
        message: 'Error previsualizando plantilla'
      });
    }
  };
}

module.exports = new EmailTemplateController();