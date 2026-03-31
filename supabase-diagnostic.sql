-- ============================================
-- DIAGNÓSTICO Y SOLUCIÓN PARA PACIENTES NO CARGAN
-- ============================================

-- PASO 1: Recargar el esquema de Supabase (solución al caché de esquema)
NOTIFY pgrst, 'reload schema';

-- PASO 2: Verificar políticas RLS actuales en la tabla pacientes
SELECT schemaname, tablename, rowsecurity, policies.polname, policies.polcmd, policies.polroles
FROM pg_tables
LEFT JOIN pg_policies policies ON policies.tablename = pg_tables.tablename
WHERE tablename = 'pacientes' AND schemaname = 'public';

-- PASO 3: Si no hay políticas RLS, crear una política básica que permita SELECT para usuarios autenticados
-- (Solo ejecutar si no hay políticas existentes)
DROP POLICY IF EXISTS "pacientes_select_policy" ON pacientes;
CREATE POLICY "pacientes_select_policy" ON pacientes
FOR SELECT USING (auth.role() = 'authenticated');

-- PASO 4: Verificar que la tabla existe y tiene los campos correctos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pacientes' AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASO 5: Verificar que hay datos en la tabla
SELECT COUNT(*) as total_pacientes FROM pacientes;

-- PASO 6: Verificar permisos de la tabla
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'pacientes' AND table_schema = 'public';