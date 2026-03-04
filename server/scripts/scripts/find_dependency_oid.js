const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'siaf_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234', 
});

const findDeps = async () => {
    const client = await pool.connect();
    try {
        // Query to find what depends on table empleados column tipo (column index 7 usually, but need to check)
        
        // First get attnum for 'tipo'
        const attRes = await client.query("SELECT attnum FROM pg_attribute WHERE attrelid = 'public.empleados'::regclass AND attname = 'tipo'");
        if (attRes.rows.length === 0) {
            console.log('Column tipo not found');
            return;
        }
        const attnum = attRes.rows[0].attnum;
        console.log('Attnum for tipo:', attnum);

        const query = `
            SELECT 
                d.classid::regclass as dependent_type,
                CASE 
                    WHEN d.classid = 'pg_rewrite'::regclass THEN (SELECT relname FROM pg_class WHERE oid = (SELECT ev_class FROM pg_rewrite WHERE oid = d.objid))
                    WHEN d.classid = 'pg_constraint'::regclass THEN (SELECT conname FROM pg_constraint WHERE oid = d.objid)
                    ELSE d.objid::text
                END as dependent_name,
                d.objid,
                d.objsubid
            FROM pg_depend d
            WHERE d.refobjid = 'public.empleados'::regclass 
            AND d.refobjsubid = $1
        `;
        
        const res = await client.query(query, [attnum]);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
};

findDeps();
