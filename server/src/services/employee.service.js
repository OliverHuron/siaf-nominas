const XLSX = require('xlsx');

/**
 * Parse Excel file and extract employee data
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} { success: boolean, data: Array, errors: Array }
 */
const parseEmployeesFromExcel = (fileBuffer) => {
    try {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row
        const rawData = XLSX.utils.sheet_to_json(worksheet);

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
            if (!row.RFC || row.RFC.toString().trim() === '') {
                rowErrors.push(`Fila ${rowNumber}: RFC es requerido`);
            } else {
                const rfc = row.RFC.toString().trim().toUpperCase();
                if (rfc.length < 10 || rfc.length > 13) {
                    rowErrors.push(`Fila ${rowNumber}: RFC debe tener entre 10 y 13 caracteres`);
                }
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
                    rfc: row.RFC.toString().trim().toUpperCase(),
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
            'RFC': 'PEGJ850101ABC',
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
            'RFC': 'LOMM900215XYZ',
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
        { wch: 15 }, // RFC
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
