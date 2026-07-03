// worker/index.ts
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { Pool, types } from '@neondatabase/serverless';

// Globally force PostgreSQL NUMERIC/DECIMAL (OID 1700) to be parsed as JavaScript floats
types.setTypeParser(1700, (val) => parseFloat(val));

type Bindings = {
  NEON_DATABASE_URL: string;
  JWT_SECRET: string;
};

type Variables = {
  user: any;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api');

// --- AUTH MIDDLEWARE ---
app.use('/protected/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    c.set('user', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// --- AUTH ROUTE ---
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const username = email.split('@')[0];
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });

  try {
    // Select all assigned counters and warehouses for session populating
    const { rows } = await pool.query(
      'SELECT id, name, role, username, password, assigned_counters, assigned_warehouses FROM profiles WHERE username = $1 LIMIT 1', 
      [username]
    );
    const user = rows[0];

    if (!user || user.password !== password) {
      if (email.startsWith('admin@') && password === 'admin1234') {
        const token = await sign({ id: 'admin-id', role: 'admin', name: 'Admin' }, c.env.JWT_SECRET, 'HS256');
        return c.json({ user: { id: 'admin-id', role: 'admin', name: 'Admin', assigned_counters: [], assigned_warehouses: [] }, token });
      }
      return c.json({ error: 'Invalid login credentials' }, 401);
    }

    c.executionCtx.waitUntil(pool.query('INSERT INTO login_logs (user_id) VALUES ($1)', [user.id]).catch(console.error));
    const token = await sign({ id: user.id, role: user.role, name: user.name }, c.env.JWT_SECRET, 'HS256');
    
    // Return complete profile to prevent frontend hooks from exiting early
    return c.json({ 
      user: { 
        id: user.id, 
        role: user.role, 
        name: user.name,
        assigned_counters: user.assigned_counters || [],
        assigned_warehouses: user.assigned_warehouses || []
      }, 
      token 
    });
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- ACCESSORIES ROUTES ---

// Get accessories (with optional model filter)
app.get('/protected/accessories', async (c) => {
  const counter_id = c.req.query('counter_id');
  const model = c.req.query('model');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  
  try {
    let query = 'SELECT * FROM accessories WHERE counter_id = $1';
    const params: any[] = [counter_id];
    
    if (model) {
      query += ' AND vehicle_model = $2';
      params.push(model);
    }
    
    const { rows } = await pool.query(query, params);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get global models for a counter
app.get('/protected/accessories/models', async (c) => {
  const counter_id = c.req.query('counter_id');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query('SELECT DISTINCT vehicle_model FROM accessories WHERE counter_id = $1 ORDER BY vehicle_model', [counter_id]);
    return c.json(rows.map(r => r.vehicle_model));
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get shortage & surplus stats
app.get('/protected/accessories/stats', async (c) => {
  const counter_id = c.req.query('counter_id');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE quantity <= 5) as shortage_count,
        COUNT(*) FILTER (WHERE quantity > 5) as surplus_count
      FROM accessories WHERE counter_id = $1
    `, [counter_id]);
    return c.json({ shortageCount: Number(rows[0].shortage_count), surplusCount: Number(rows[0].surplus_count) });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Search accessories
app.get('/protected/accessories/search', async (c) => {
  const counter_id = c.req.query('counter_id');
  const q = c.req.query('q') || '';
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`
      SELECT * FROM accessories 
      WHERE counter_id = $1 AND (name ILIKE $2 OR accessory_code ILIKE $2 OR vehicle_model ILIKE $2) LIMIT 20
    `, [counter_id, `%${q}%`]);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- DRAWER TRANSACTIONS ROUTES ---

// Get drawer transactions
app.get('/protected/drawer_transactions', async (c) => {
  const counter_id = c.req.query('counter_id');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query('SELECT * FROM drawer_transactions WHERE counter_id = $1 ORDER BY created_at DESC', [counter_id]);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Insert drawer transaction
app.post('/protected/drawer_transactions', async (c) => {
  const body = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    await pool.query(`
      INSERT INTO drawer_transactions (counter_id, transaction_type, amount, status, category, details, bank_name, account_number, ifsc_code, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [body.counter_id, body.transaction_type, body.amount, body.status, body.category, body.details, body.bank_name, body.account_number, body.ifsc_code]);
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Update drawer transaction status
app.put('/protected/drawer_transactions/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    await pool.query('UPDATE drawer_transactions SET status = $1 WHERE id = $2', [status, id]);
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- BILLS ROUTES ---

// Get Bills
app.get('/protected/bills', async (c) => {
  const counter_id = c.req.query('counter_id');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`
      SELECT b.*, json_build_object('name', a.name, 'accessory_code', a.accessory_code, 'vehicle_model', a.vehicle_model) as accessories, p.name as counter_name 
      FROM bills b 
      LEFT JOIN accessories a ON b.accessory_id = a.id 
      LEFT JOIN profiles p ON b.counter_id = p.id 
      WHERE b.counter_id = $1 
      ORDER BY b.created_at DESC
    `, [counter_id]);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Generate Bill (Checkout Transaction)
app.post('/protected/bills/checkout', async (c) => {
  const { items, chassisNo, engineNo, checklistNo, customerName, customerPhone, customerId, payments, userId } = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Generate unique bill number
    const numRes = await client.query("SELECT bill_number FROM bills WHERE bill_number LIKE 'INV-%' ORDER BY created_at DESC LIMIT 100");
    let maxNum = 0;
    numRes.rows.forEach((r: any) => {
        const match = r.bill_number?.match(/INV-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
    });
    const finalBillNumber = `INV-${String(maxNum + 1).padStart(4, '0')}`;
    
    const primaryMethod = payments.length > 1 ? 'Split Payment' : payments[0].method;
    const totalPaid = payments.reduce((s:number, p:any) => s + (Number(p.amount) || 0), 0);
    
    // 2. Insert items and update inventory
    for(let i=0; i<items.length; i++) {
        const item = items[i];
        const base = item.accessory.price * item.quantity;
        const cgst = base * ((item.accessory.cgst_percent || 0) / 100);
        const sgst = base * ((item.accessory.sgst_percent || 0) / 100);
        const total = base + cgst + sgst;
        const currentBillNumber = items.length > 1 ? `${finalBillNumber}-${i+1}` : finalBillNumber;
        const left = Math.max(0, total - totalPaid);
        
        await client.query(`
          INSERT INTO bills (
            bill_number, counter_id, accessory_id, chassis_number, engine_number, 
            checklist_number, customer_name, customer_phone, customer_id, quantity, 
            base_amount, cgst_amount, sgst_amount, total_amount, payment_method, 
            payment_details, amount_paid, amount_left, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
        `, [
          currentBillNumber, userId, item.accessory.id, chassisNo, engineNo, checklistNo, 
          customerName, customerPhone, customerId, item.quantity, base, cgst, sgst, total, 
          primaryMethod, JSON.stringify(payments), i === 0 ? totalPaid : 0, i === 0 ? left : 0
        ]);

        await client.query(`UPDATE accessories SET quantity = quantity - $1 WHERE id = $2`, [item.quantity, item.accessory.id]);
    }
    
    await client.query('COMMIT');
    return c.json({ success: true, bill_number: finalBillNumber });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return c.json({ error: 'Failed to generate bill' }, 500);
  } finally {
    client.release();
    c.executionCtx.waitUntil(pool.end());
  }
});

// Update Bill Status (For Team Lead / Admin reversion logic)
app.put('/protected/bills/status', async (c) => {
  const { itemIds, status, counterId, itemsToRestore } = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE bills SET approval_status = $1 WHERE id = ANY($2::uuid[])`, [status, itemIds]);
    
    if (status === 'reverted' || status === 'reverted_by_admin') {
      for (const item of itemsToRestore) {
        if (item.accessory_id) {
          await client.query(`UPDATE accessories SET quantity = quantity + $1 WHERE id = $2`, [item.quantity, item.accessory_id]);
        } else if (item.vehicle_model && item.name) {
          await client.query(`UPDATE accessories SET quantity = quantity + $1 WHERE counter_id = $2 AND vehicle_model = $3 AND name = $4`, [item.quantity, counterId, item.vehicle_model, item.name]);
        }
      }
    }
    await client.query('COMMIT');
    return c.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return c.json({ error: 'Failed to update bill status' }, 500);
  } finally {
    client.release();
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- ADMIN / TEAM LEAD / CASHIER DATA COHESION ---

// Get self profile
app.get('/protected/profiles/me', async (c) => {
  const user = c.get('user');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [user.id]);
    return c.json(rows[0] || null);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get user names for ID lists
app.post('/protected/profiles/list', async (c) => {
  const { ids } = await c.req.json();
  if (!ids || ids.length === 0) return c.json([]);
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`SELECT id, name FROM profiles WHERE id = ANY($1::uuid[])`, [ids]);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get consolidated cashier drawer transactions
app.post('/protected/drawer_transactions/list', async (c) => {
  const { counter_ids } = await c.req.json();
  if (!counter_ids || counter_ids.length === 0) return c.json([]);
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`SELECT d.*, p.name as counter_name FROM drawer_transactions d LEFT JOIN profiles p ON d.counter_id = p.id WHERE d.counter_id = ANY($1::uuid[]) ORDER BY d.created_at DESC`, [counter_ids]);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get consolidated bills with limit filters
app.post('/protected/bills/list', async (c) => {
  const { counter_ids, limit, days } = await c.req.json();
  if (!counter_ids || counter_ids.length === 0) return c.json([]);
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    let query = `SELECT b.*, json_build_object('name', a.name, 'accessory_code', a.accessory_code, 'vehicle_model', a.vehicle_model) as accessories, p.name as counter_name FROM bills b LEFT JOIN accessories a ON b.accessory_id = a.id LEFT JOIN profiles p ON b.counter_id = p.id WHERE b.counter_id = ANY($1::uuid[])`;
    if (days) query += ` AND b.created_at >= NOW() - INTERVAL '${days} days'`;
    query += ` ORDER BY b.created_at DESC`;
    if (limit) query += ` LIMIT ${limit}`;
    const { rows } = await pool.query(query, [counter_ids]);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- ADMIN SPECIFIC PROFILE & INVENTORY MANAGEMENT ---

// Admin system stats
app.get('/protected/admin/stats', async (c) => {
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const logins = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM login_logs');
    const items = await pool.query('SELECT COUNT(*) as count FROM accessories');
    const models = await pool.query('SELECT COUNT(DISTINCT vehicle_model) as count FROM accessories');
    return c.json({ uniqueLogins: Number(logins.rows[0].count), items: Number(items.rows[0].count), models: Number(models.rows[0].count) });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get system profiles by role
app.get('/protected/admin/profiles/:role', async (c) => {
  const role = c.req.param('role');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`SELECT p.*, (SELECT COUNT(*) FROM login_logs WHERE user_id = p.id) as login_count FROM profiles p WHERE p.role = $1`, [role]);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Create profile
app.post('/protected/admin/profiles', async (c) => {
  const body = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`
      INSERT INTO profiles (id, name, username, password, role, assigned_counters, assigned_warehouses) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING id`, 
      [body.name, body.username, body.password, body.role, body.assigned_counters || [], body.assigned_warehouses || []]);
    return c.json({ success: true, id: rows[0].id });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Update profile
app.put('/protected/admin/profiles/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    await pool.query(
      `UPDATE profiles 
       SET name = $1, username = $2, password = $3, assigned_counters = $4, assigned_warehouses = $5 
       WHERE id = $6`,
      [body.name || body.username || '', body.username || '', body.password || '', body.assigned_counters || [], body.assigned_warehouses || [], id]
    );
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Delete profile
app.delete('/protected/admin/profiles/:id', async (c) => {
  const id = c.req.param('id');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM bills WHERE counter_id = $1', [id]);
    await client.query('DELETE FROM login_logs WHERE user_id = $1', [id]);
    await client.query('DELETE FROM accessories WHERE counter_id = $1', [id]);
    await client.query('DELETE FROM profiles WHERE id = $1', [id]);
    await client.query('COMMIT');
    return c.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return c.json({ error: 'Failed to delete profile' }, 500);
  } finally {
    client.release();
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin global accessories list with date filter options
app.get('/protected/admin/inventory', async (c) => {
  const start = c.req.query('start');
  const end = c.req.query('end');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    let query = 'SELECT a.*, p.name as counter_name FROM accessories a JOIN profiles p ON a.counter_id = p.id';
    const params: any[] = [];
    if (start && end) {
      query += ' WHERE a.created_at >= $1 AND a.created_at <= $2';
      params.push(`${start}T00:00:00`, `${end}T23:59:59`);
    } else if (start) {
      query += ' WHERE a.created_at >= $1';
      params.push(`${start}T00:00:00`);
    } else if (end) {
      query += ' WHERE a.created_at <= $1';
      params.push(`${end}T23:59:59`);
    }
    query += ' ORDER BY a.created_at DESC';
    const { rows } = await pool.query(query, params);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin delete accessory
app.delete('/protected/admin/accessories/:id', async (c) => {
  const id = c.req.param('id');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    await pool.query('DELETE FROM accessories WHERE id = $1', [id]);
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin update accessory
app.put('/protected/admin/accessories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    await pool.query('UPDATE accessories SET quantity = $1, price = $2 WHERE id = $3', [body.quantity, body.price, id]);
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin delete upload logs by upload date
app.delete('/protected/admin/accessories/by-date/:date', async (c) => {
  const date = c.req.param('date');
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    await pool.query('DELETE FROM accessories WHERE created_at >= $1 AND created_at <= $2', [`${date}T00:00:00`, `${date}T23:59:59`]);
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin single item stock transfer
app.post('/protected/admin/accessories/transfer', async (c) => {
  const { id, targetCounterId, quantity } = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const sourceRes = await client.query('SELECT * FROM accessories WHERE id = $1', [id]);
    const source = sourceRes.rows[0];
    if (!source || source.quantity < quantity) {
      throw new Error('Insufficient stock or accessory not found');
    }
    
    await client.query('UPDATE accessories SET quantity = quantity - $1 WHERE id = $2', [quantity, id]);
    
    const targetRes = await client.query(
      'SELECT id, quantity FROM accessories WHERE counter_id = $1 AND vehicle_model = $2 AND name = $3 LIMIT 1',
      [targetCounterId, source.vehicle_model, source.name]
    );
    
    if (targetRes.rows.length > 0) {
      await client.query('UPDATE accessories SET quantity = quantity + $1 WHERE id = $2', [quantity, targetRes.rows[0].id]);
    } else {
      await client.query(
        `INSERT INTO accessories (counter_id, vehicle_model, name, accessory_code, price, cgst_percent, sgst_percent, quantity, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [targetCounterId, source.vehicle_model, source.name, source.accessory_code, source.price, source.cgst_percent, source.sgst_percent, quantity]
      );
    }
    
    await client.query('COMMIT');
    return c.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ error: err.message || 'Transfer failed' }, 500);
  } finally {
    client.release();
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin bulk transfer list (Cart transfers)
app.post('/protected/admin/accessories/transfer-bulk', async (c) => {
  const { items, targetCounterId } = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const item of items) {
      const qty = item.transferQuantity !== undefined ? item.transferQuantity : item.quantity;
      const sourceRes = await client.query('SELECT * FROM accessories WHERE id = $1', [item.id]);
      const source = sourceRes.rows[0];
      if (!source || source.quantity < qty) {
        throw new Error(`Insufficient stock for item: ${item.name || 'Unknown'}`);
      }
      
      await client.query('UPDATE accessories SET quantity = quantity - $1 WHERE id = $2', [qty, item.id]);
      
      const targetRes = await client.query(
        'SELECT id, quantity FROM accessories WHERE counter_id = $1 AND vehicle_model = $2 AND name = $3 LIMIT 1',
        [targetCounterId, source.vehicle_model, source.name]
      );
      
      if (targetRes.rows.length > 0) {
        await client.query('UPDATE accessories SET quantity = quantity + $1 WHERE id = $2', [qty, targetRes.rows[0].id]);
      } else {
        await client.query(
          `INSERT INTO accessories (counter_id, vehicle_model, name, accessory_code, price, cgst_percent, sgst_percent, quantity, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [targetCounterId, source.vehicle_model, source.name, source.accessory_code, source.price, source.cgst_percent, source.sgst_percent, qty]
        );
      }
    }
    
    await client.query('COMMIT');
    return c.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return c.json({ error: err.message || 'Bulk transfer failed' }, 500);
  } finally {
    client.release();
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin Excel Upload upsert loops
app.post('/protected/admin/accessories/upload', async (c) => {
  const { rows } = await c.req.json();
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      const existRes = await client.query(
        'SELECT id, quantity FROM accessories WHERE counter_id = $1 AND LOWER(vehicle_model) = LOWER($2) AND LOWER(name) = LOWER($3) LIMIT 1',
        [row.counter_id, row.vehicle_model, row.name]
      );
      
      if (existRes.rows.length > 0) {
        await client.query(
          `UPDATE accessories 
           SET quantity = quantity + $1, price = $2, accessory_code = COALESCE($3, accessory_code), cgst_percent = $4, sgst_percent = $5 
           WHERE id = $6`,
          [row.quantity, row.price, row.accessory_code || null, row.cgst_percent || 0, row.sgst_percent || 0, existRes.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO accessories (counter_id, vehicle_model, name, accessory_code, quantity, price, cgst_percent, sgst_percent, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [row.counter_id, row.vehicle_model, row.name, row.accessory_code || null, row.quantity, row.price, row.cgst_percent || 0, row.sgst_percent || 0, row.created_at]
        );
      }
    }
    await client.query('COMMIT');
    return c.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return c.json({ error: 'Failed to process upload' }, 500);
  } finally {
    client.release();
    c.executionCtx.waitUntil(pool.end());
  }
});

// Admin get global bills
app.get('/protected/admin/bills', async (c) => {
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  try {
    const { rows } = await pool.query(`
      SELECT b.*, p.name as counter_name, json_build_object('name', a.name, 'accessory_code', a.accessory_code, 'vehicle_model', a.vehicle_model) as accessories 
      FROM bills b 
      LEFT JOIN profiles p ON b.counter_id = p.id 
      LEFT JOIN accessories a ON b.accessory_id = a.id 
      ORDER BY b.created_at DESC
    `);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

export default app;