const XLSX = require('xlsx');

/**
 * Parse Excel file and extract employee data
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} { success: boolean, data: Array, errors: Array }
 */
const parseEmployeesFromExcel = (fileBuffer) => {
    try {
        console.log('[PARSE_EXCEL] Starting parse, buffer size:', fileBuffer.length);

        // Try reading with cellFormula and cellStyles disabled for better performance
        const workbook = XLSX.read(fileBuffer, {
            type: 'buffer',
            cellFormula: false,
            cellStyles: false,
            sheetStubs: false
        });

        console.log('[PARSE_EXCEL] Workbook sheets:', workbook.SheetNames);

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            console.log('[PARSE_EXCEL] No sheets found in workbook');
            return {
                success: false,
                data: [],
                errors: ['El archivo Excel no contiene hojas de datos']
            };
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            console.log('[PARSE_EXCEL] Worksheet is undefined for sheet:', sheetName);
            return {
                success: false,
                data: [],
                errors: ['No se pudo leer la hoja de datos del archivo Excel']
            };
        }

        // Debug worksheet info
        const range = worksheet['!ref'];
        console.log('[PARSE_EXCEL] Worksheet range:', range);

        if (!range) {
            console.log('[PARSE_EXCEL] Worksheet has no range (empty sheet)');
            return {
                success: false,
                data: [],
                errors: ['La hoja de Excel está vacía']
            };
        }

        // Try to see first few cells
        console.log('[PARSE_EXCEL] Cell A1:', worksheet['A1']);
        console.log('[PARSE_EXCEL] Cell A2:', worksheet['A2']);
        console.log('[PARSE_EXCEL] Cell B1:', worksheet['B1']);

        // Convert to JSON with header row
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        console.log('[PARSE_EXCEL] Rows found:', rawData.length);

        if (rawData.length > 0) {
            console.log('[PARSE_EXCEL] First row columns:', Object.keys(rawData[0]));
            console.log('[PARSE_EXCEL] First row sample:', JSON.stringify(rawData[0]).substring(0, 200));
        }

        if (rawData.length === 0) {
            return {
                success: false,
                data: [],
                errors: ['El archivo Excel está vacío']
            };
        }

        const validEmployees = [];
        const errors = [];

        rawData.forEach((row, index) => {
            const rowNumber = index + 2; // Excel rows start at 1, header is row 1
            const rowErrors = [];

            // Validate required fields
            if (!row.Nombre || row.Nombre.toString().trim() === '') {
                rowErrors.push(`Fila ${rowNumber}: Nombre es requerido`);
            }
            if (!row['Apellido Paterno'] || row['Apellido Paterno'].toString().trim() === '') {
                rowErrors.push(`Fila ${rowNumber}: Apellido Paterno es requerido`);
            }
            if (!row.Tipo || !['docente', 'administrativo'].includes(row.Tipo.toString().toLowerCase())) {
                rowErrors.push(`Fila ${rowNumber}: Tipo debe ser "docente" o "administrativo"`);
            }

            // Validate tipo-specific fields
            const tipo = row.Tipo ? row.Tipo.toString().toLowerCase() : '';
            if (tipo === 'docente' && row['Unidad Responsable']) {
                const ur = row['Unidad Responsable'].toString().trim();
                if (!['231', '231-1', '231-2', '231-3'].includes(ur)) {
                    rowErrors.push(`Fila ${rowNumber}: Unidad Responsable inválida para docente`);
                }
            }
            if (tipo === 'administrativo' && row['Subtipo Administrativo']) {
                const subtipo = row['Subtipo Administrativo'].toString().trim();
                if (!['Administrativo de Base', 'Administrativo de Apoyo'].includes(subtipo)) {
                    rowErrors.push(`Fila ${rowNumber}: Subtipo Administrativo inválido`);
                }
            }

            // Validate email format if provided
            if (row.Email && row.Email.toString().trim() !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(row.Email.toString().trim())) {
                    rowErrors.push(`Fila ${rowNumber}: Email inválido`);
                }
            }

            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
            } else {
                // Parse activo field
                let activo = true;
                if (row.Activo !== undefined && row.Activo !== null) {
                    const activoStr = row.Activo.toString().toLowerCase().trim();
                    if (['no', 'false', '0', 'inactivo'].includes(activoStr)) {
                        activo = false;
                    }
                }

                validEmployees.push({
                    nombre: row.Nombre.toString().trim(),
                    apellido_paterno: row['Apellido Paterno'].toString().trim(),
                    apellido_materno: row['Apellido Materno'] ? row['Apellido Materno'].toString().trim() : null,
                    email: row.Email ? row.Email.toString().trim() : null,
                    telefono: row.Teléfono || row.Telefono ? (row.Teléfono || row.Telefono).toString().trim() : null,
                    tipo: tipo,
                    unidad_responsable: tipo === 'docente' && row['Unidad Responsable']
                        ? row['Unidad Responsable'].toString().trim()
                        : null,
                    subtipo_administrativo: tipo === 'administrativo' && row['Subtipo Administrativo']
                        ? row['Subtipo Administrativo'].toString().trim()
                        : null,
                    activo: activo,
                    dependencia_id: null
                });
            }
        });

        return {
            success: errors.length === 0,
            data: validEmployees,
            errors: errors
        };
    } catch (error) {
        console.error('Error parsing Excel:', error);
        return {
            success: false,
            data: [],
            errors: [`Error al procesar el archivo: ${error.message}`]
        };
    }
};

/**
 * Generate Excel template for employee import
 * @returns {Buffer} Excel file buffer
 */
const generateEmployeeTemplate = () => {
    const templateData = [
        {
            'Nombre': 'Juan',
            'Apellido Paterno': 'Pérez',
            'Apellido Materno': 'García',
            'Email': 'juan.perez@example.com',
            'Teléfono': '4431234567',
            'Tipo': 'docente',
            'Unidad Responsable': '231',
            'Subtipo Administrativo': '',
            'Activo': 'Sí'
        },
        {
            'Nombre': 'María',
            'Apellido Paterno': 'López',
            'Apellido Materno': 'Martínez',
            'Email': 'maria.lopez@example.com',
            'Teléfono': '4439876543',
            'Tipo': 'administrativo',
            'Unidad Responsable': '',
            'Subtipo Administrativo': 'Administrativo de Base',
            'Activo': 'Sí'
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');

    // Set column widths
    worksheet['!cols'] = [
        { wch: 15 }, // Nombre
        { wch: 18 }, // Apellido Paterno
        { wch: 18 }, // Apellido Materno
        { wch: 25 }, // Email
        { wch: 12 }, // Teléfono
        { wch: 15 }, // Tipo
        { wch: 20 }, // Unidad Responsable
        { wch: 25 }, // Subtipo Administrativo
        { wch: 10 }  // Activo
    ];

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
    parseEmployeesFromExcel,
    generateEmployeeTemplate
};
