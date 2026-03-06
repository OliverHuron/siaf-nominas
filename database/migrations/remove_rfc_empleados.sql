-- =====================================================
-- Migración: Eliminar campo RFC de empleados y usuarios
-- Fecha: 2026-03-05
-- IMPORTANTE: Hacer respaldo antes de ejecutar
-- =====================================================

-- 1. Eliminar índice de RFC en empleados
DROP INDEX IF EXISTS idx_empleados_rfc_lower;

-- 2. Eliminar constraint único de RFC en empleados
ALTER TABLE empleados DROP CONSTRAINT IF EXISTS employees_rfc_unique;

-- 3. Eliminar la columna rfc de empleados
ALTER TABLE empleados DROP COLUMN IF EXISTS rfc;

-- 4. Eliminar la columna rfc de usuarios
ALTER TABLE usuarios DROP COLUMN IF EXISTS rfc;

-- Verificar (opcional): 
-- \d empleados
-- \d usuarios
