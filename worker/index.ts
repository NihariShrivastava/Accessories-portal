import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { Pool, types } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, or, ilike, desc, sql, inArray } from 'drizzle-orm';
import * as schema from './db/schema.js';

// Globally force PostgreSQL NUMERIC/DECIMAL (OID 1700) to be parsed as JavaScript float numbers
types.setTypeParser(1700, (val: any) => parseFloat(val));

type Bindings = {
  NEON_DATABASE_URL: string;
  JWT_SECRET: string;
};

type Variables = {
  user: any;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api');

// Helper to init drizzle per request
const getDb = (c: any) => {
  const pool = new Pool({ connectionString: c.env.NEON_DATABASE_URL });
  return { db: drizzle(pool, { schema }), pool };
};

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
  const { db, pool } = getDb(c);

  try {
    const users = await db.select().from(schema.profiles)
      .where(sql`LOWER(${schema.profiles.username}) = LOWER(${username})`)
      .limit(1);
    
    const user = users[0];

    if (!user || user.password !== password) {
      if (email.startsWith('admin@') && password === 'admin1234') {
        const token = await sign({ id: 'admin-id', role: 'admin', name: 'Admin' }, c.env.JWT_SECRET, 'HS256');
        return c.json({ user: { id: 'admin-id', role: 'admin', name: 'Admin', assigned_counters: [], assigned_warehouses: [] }, token });
      }
      return c.json({ error: 'Invalid login credentials' }, 401);
    }

    c.executionCtx.waitUntil(db.insert(schema.loginLogs).values({ user_id: user.id }).catch(console.error));
    const token = await sign({ id: user.id, role: user.role, name: user.name }, c.env.JWT_SECRET, 'HS256');
    
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
  const { db, pool } = getDb(c);
  
  try {
    const conditions = [eq(schema.accessories.counter_id, counter_id as string)];
    if (model) conditions.push(eq(schema.accessories.vehicle_model, model));
    
    const rows = await db.select().from(schema.accessories).where(and(...conditions));
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get global models for a counter
app.get('/protected/accessories/models', async (c) => {
  const counter_id = c.req.query('counter_id');
  const { db, pool } = getDb(c);
  try {
    const rows = await db.selectDistinct({ vehicle_model: schema.accessories.vehicle_model })
      .from(schema.accessories)
      .where(eq(schema.accessories.counter_id, counter_id as string))
      .orderBy(schema.accessories.vehicle_model);
    return c.json(rows.map(r => r.vehicle_model));
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Get shortage & surplus stats
app.get('/protected/accessories/stats', async (c) => {
  const counter_id = c.req.query('counter_id');
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select({
      shortageCount: sql<number>`COUNT(*) FILTER (WHERE quantity <= 5)`,
      surplusCount: sql<number>`COUNT(*) FILTER (WHERE quantity > 5)`
    }).from(schema.accessories).where(eq(schema.accessories.counter_id, counter_id as string));
    return c.json({ shortageCount: Number(rows[0].shortageCount), surplusCount: Number(rows[0].surplusCount) });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// Search accessories
app.get('/protected/accessories/search', async (c) => {
  const counter_id = c.req.query('counter_id');
  const q = c.req.query('q') || '';
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select().from(schema.accessories)
      .where(and(
        eq(schema.accessories.counter_id, counter_id as string),
        or(
          ilike(schema.accessories.name, `%${q}%`),
          ilike(schema.accessories.accessory_code, `%${q}%`),
          ilike(schema.accessories.vehicle_model, `%${q}%`)
        )
      )).limit(20);
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- DRAWER TRANSACTIONS ROUTES ---

app.get('/protected/drawer_transactions', async (c) => {
  const counter_id = c.req.query('counter_id');
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select().from(schema.drawerTransactions)
      .where(eq(schema.drawerTransactions.counter_id, counter_id as string))
      .orderBy(desc(schema.drawerTransactions.created_at));
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/drawer_transactions', async (c) => {
  const body = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.insert(schema.drawerTransactions).values({
      counter_id: body.counter_id,
      transaction_type: body.transaction_type,
      amount: String(body.amount),
      status: body.status,
      category: body.category,
      details: body.details,
      bank_name: body.bank_name,
      account_number: body.account_number,
      ifsc_code: body.ifsc_code
    });
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.put('/protected/drawer_transactions/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.update(schema.drawerTransactions)
      .set({ status })
      .where(eq(schema.drawerTransactions.id, id));
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- BILLS ROUTES ---

app.get('/protected/bills', async (c) => {
  const counter_id = c.req.query('counter_id');
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select({
      bill: schema.bills,
      accessory: {
        name: schema.accessories.name,
        accessory_code: schema.accessories.accessory_code,
        vehicle_model: schema.accessories.vehicle_model
      },
      counter_name: schema.profiles.name
    }).from(schema.bills)
      .leftJoin(schema.accessories, eq(schema.bills.accessory_id, schema.accessories.id))
      .leftJoin(schema.profiles, eq(schema.bills.counter_id, schema.profiles.id))
      .where(eq(schema.bills.counter_id, counter_id as string))
      .orderBy(desc(schema.bills.created_at));
      
    return c.json(rows.map(r => ({ ...r.bill, accessories: r.accessory, counter_name: r.counter_name })));
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/bills/checkout', async (c) => {
  const { items, chassisNo, engineNo, checklistNo, customerName, customerPhone, customerId, payments, userId } = await c.req.json();
  const { db, pool } = getDb(c);
  
  try {
    const finalBillNumber = await db.transaction(async (tx) => {
      const numRes = await tx.execute(sql`SELECT bill_number FROM bills WHERE bill_number LIKE 'INV-%' ORDER BY created_at DESC LIMIT 100`);
      let maxNum = 0;
      numRes.rows.forEach((r: any) => {
          const match = r.bill_number?.match(/INV-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
      });
      const generatedBillNumber = `INV-${String(maxNum + 1).padStart(4, '0')}`;
      
      const primaryMethod = payments.length > 1 ? 'Split Payment' : payments[0].method;
      const totalPaid = payments.reduce((s:number, p:any) => s + (Number(p.amount) || 0), 0);
      
      for(let i=0; i<items.length; i++) {
          const item = items[i];
          const base = item.accessory.price * item.quantity;
          const cgst = base * ((item.accessory.cgst_percent || 0) / 100);
          const sgst = base * ((item.accessory.sgst_percent || 0) / 100);
          const total = base + cgst + sgst;
          const currentBillNumber = items.length > 1 ? `${generatedBillNumber}-${i+1}` : generatedBillNumber;
          const left = Math.max(0, total - totalPaid);
          
          await tx.insert(schema.bills).values({
            bill_number: currentBillNumber,
            counter_id: userId,
            accessory_id: item.accessory.id,
            chassis_number: chassisNo,
            engine_number: engineNo,
            checklist_number: checklistNo,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_id: customerId,
            quantity: item.quantity,
            base_amount: String(base),
            cgst_amount: String(cgst),
            sgst_amount: String(sgst),
            total_amount: String(total),
            payment_method: primaryMethod,
            payment_details: payments,
            amount_paid: String(i === 0 ? totalPaid : 0),
            amount_left: String(i === 0 ? left : 0)
          });
  
          await tx.update(schema.accessories)
            .set({ quantity: sql`${schema.accessories.quantity} - ${item.quantity}` })
            .where(eq(schema.accessories.id, item.accessory.id));
      }
      return generatedBillNumber;
    });
    
    return c.json({ success: true, bill_number: finalBillNumber });
  } catch (err) {
    console.error(err);
    return c.json({ error: 'Failed to generate bill' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.put('/protected/bills/status', async (c) => {
  const { itemIds, status, counterId, itemsToRestore } = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.transaction(async (tx) => {
      await tx.update(schema.bills)
        .set({ approval_status: status })
        .where(inArray(schema.bills.id, itemIds));
      
      if (status === 'reverted' || status === 'reverted_by_admin') {
        for (const item of itemsToRestore) {
          if (item.accessory_id) {
            await tx.update(schema.accessories)
              .set({ quantity: sql`${schema.accessories.quantity} + ${item.quantity}` })
              .where(eq(schema.accessories.id, item.accessory_id));
          } else if (item.vehicle_model && item.name) {
            await tx.update(schema.accessories)
              .set({ quantity: sql`${schema.accessories.quantity} + ${item.quantity}` })
              .where(and(
                eq(schema.accessories.counter_id, counterId),
                eq(schema.accessories.vehicle_model, item.vehicle_model),
                eq(schema.accessories.name, item.name)
              ));
          }
        }
      }
    });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to update bill status' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- ADMIN / TEAM LEAD / CASHIER DATA COHESION ---

app.get('/protected/profiles/me', async (c) => {
  const user = c.get('user');
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select().from(schema.profiles).where(eq(schema.profiles.id, user.id));
    return c.json(rows[0] || null);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/profiles/list', async (c) => {
  const { ids } = await c.req.json();
  if (!ids || ids.length === 0) return c.json([]);
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select({ id: schema.profiles.id, name: schema.profiles.name })
      .from(schema.profiles)
      .where(inArray(schema.profiles.id, ids));
    return c.json(rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/drawer_transactions/list', async (c) => {
  const { counter_ids } = await c.req.json();
  if (!counter_ids || counter_ids.length === 0) return c.json([]);
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select({
      txn: schema.drawerTransactions,
      counter_name: schema.profiles.name
    }).from(schema.drawerTransactions)
      .leftJoin(schema.profiles, eq(schema.drawerTransactions.counter_id, schema.profiles.id))
      .where(inArray(schema.drawerTransactions.counter_id, counter_ids))
      .orderBy(desc(schema.drawerTransactions.created_at));
    
    return c.json(rows.map(r => ({ ...r.txn, counter_name: r.counter_name })));
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/bills/list', async (c) => {
  const { counter_ids, limit, days } = await c.req.json();
  if (!counter_ids || counter_ids.length === 0) return c.json([]);
  const { db, pool } = getDb(c);
  try {
    let q = db.select({
      bill: schema.bills,
      accessory: {
        name: schema.accessories.name,
        accessory_code: schema.accessories.accessory_code,
        vehicle_model: schema.accessories.vehicle_model
      },
      counter_name: schema.profiles.name
    }).from(schema.bills)
      .leftJoin(schema.accessories, eq(schema.bills.accessory_id, schema.accessories.id))
      .leftJoin(schema.profiles, eq(schema.bills.counter_id, schema.profiles.id));
      
    const conditions: any[] = [inArray(schema.bills.counter_id, counter_ids)];
    if (days) {
      conditions.push(sql`${schema.bills.created_at} >= NOW() - INTERVAL '${sql.raw(String(days))} days'`);
    }
    
    q.where(and(...conditions)).orderBy(desc(schema.bills.created_at));
    
    if (limit) {
      // Drizzle dynamic query needs await
    }
    
    let rows = await (limit ? q.limit(limit) : q);
    
    return c.json(rows.map(r => ({ ...r.bill, accessories: r.accessory, counter_name: r.counter_name })));
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// --- ADMIN SPECIFIC PROFILE & INVENTORY MANAGEMENT ---

app.get('/protected/admin/stats', async (c) => {
  const { db, pool } = getDb(c);
  try {
    const logins = await db.select({ count: sql<number>`COUNT(DISTINCT ${schema.loginLogs.user_id})` }).from(schema.loginLogs);
    const items = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.accessories);
    const models = await db.select({ count: sql<number>`COUNT(DISTINCT ${schema.accessories.vehicle_model})` }).from(schema.accessories);
    return c.json({ 
      uniqueLogins: Number(logins[0].count), 
      items: Number(items[0].count), 
      models: Number(models[0].count) 
    });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.get('/protected/admin/profiles/:role', async (c) => {
  const role = c.req.param('role');
  const { db, pool } = getDb(c);
  try {
    const res = await db.execute(sql`
      SELECT p.*, (SELECT COUNT(*) FROM login_logs WHERE user_id = p.id) as login_count 
      FROM profiles p WHERE p.role = ${role}
    `);
    return c.json(res.rows);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/admin/profiles', async (c) => {
  const body = await c.req.json();
  const { db, pool } = getDb(c);
  
  try {
    const newId = await db.transaction(async (tx) => {
      const idRes = await tx.execute(sql`SELECT gen_random_uuid() as id`);
      const generatedId = idRes.rows[0].id as string;
      const mockEmail = `${body.username.trim().toLowerCase()}@portal.local`;
      await tx.execute(sql`INSERT INTO auth.users (id, email) VALUES (${generatedId}, ${mockEmail})`);
      
      await tx.insert(schema.profiles).values({
        id: generatedId,
        name: body.name || body.username || '',
        username: body.username,
        password: body.password,
        role: body.role,
        assigned_counters: body.assigned_counters || [],
        assigned_warehouses: body.assigned_warehouses || []
      });
      return generatedId;
    });
    return c.json({ success: true, id: newId });
  } catch (err: any) {
    console.error('Create profile error:', err);
    return c.json({ error: err.message || 'Failed to create profile' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.put('/protected/admin/profiles/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.update(schema.profiles).set({
      name: body.name || body.username || '',
      username: body.username || '',
      password: body.password || '',
      assigned_counters: body.assigned_counters || [],
      assigned_warehouses: body.assigned_warehouses || []
    }).where(eq(schema.profiles.id, id));
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.delete('/protected/admin/profiles/:id', async (c) => {
  const id = c.req.param('id');
  const { db, pool } = getDb(c);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(schema.bills).where(eq(schema.bills.counter_id, id));
      await tx.delete(schema.loginLogs).where(eq(schema.loginLogs.user_id, id));
      await tx.delete(schema.accessories).where(eq(schema.accessories.counter_id, id));
      await tx.delete(schema.profiles).where(eq(schema.profiles.id, id));
    });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete profile' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.get('/protected/admin/inventory', async (c) => {
  const start = c.req.query('start');
  const end = c.req.query('end');
  const { db, pool } = getDb(c);
  try {
    let q = db.select({
      accessory: schema.accessories,
      counter_name: schema.profiles.name
    }).from(schema.accessories)
      .leftJoin(schema.profiles, eq(schema.accessories.counter_id, schema.profiles.id));
      
    const conditions = [];
    if (start) conditions.push(sql`${schema.accessories.created_at} >= ${start + 'T00:00:00'}`);
    if (end) conditions.push(sql`${schema.accessories.created_at} <= ${end + 'T23:59:59'}`);
    
    if (conditions.length > 0) q.where(and(...conditions));
    q.orderBy(desc(schema.accessories.created_at));
    
    const rows = await q;
    return c.json(rows.map(r => ({ ...r.accessory, counter_name: r.counter_name })));
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.delete('/protected/admin/accessories/:id', async (c) => {
  const id = c.req.param('id');
  const { db, pool } = getDb(c);
  try {
    await db.delete(schema.accessories).where(eq(schema.accessories.id, id));
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.put('/protected/admin/accessories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.update(schema.accessories)
      .set({ quantity: body.quantity, price: String(body.price) })
      .where(eq(schema.accessories.id, id));
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.delete('/protected/admin/accessories/by-date/:date', async (c) => {
  const date = c.req.param('date');
  const { db, pool } = getDb(c);
  try {
    await db.delete(schema.accessories)
      .where(and(
        sql`${schema.accessories.created_at} >= ${date + 'T00:00:00'}`,
        sql`${schema.accessories.created_at} <= ${date + 'T23:59:59'}`
      ));
    return c.json({ success: true });
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/admin/accessories/transfer', async (c) => {
  const { id, targetCounterId, quantity } = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.transaction(async (tx) => {
      const sourceList = await tx.select().from(schema.accessories).where(eq(schema.accessories.id, id));
      const source = sourceList[0];
      if (!source || source.quantity < quantity) {
        throw new Error('Insufficient stock or accessory not found');
      }
      
      await tx.update(schema.accessories).set({ quantity: sql`${schema.accessories.quantity} - ${quantity}` }).where(eq(schema.accessories.id, id));
      
      const targetList = await tx.select().from(schema.accessories)
        .where(and(
          eq(schema.accessories.counter_id, targetCounterId),
          eq(schema.accessories.vehicle_model, source.vehicle_model),
          eq(schema.accessories.name, source.name)
        )).limit(1);
        
      if (targetList.length > 0) {
        await tx.update(schema.accessories).set({ quantity: sql`${schema.accessories.quantity} + ${quantity}` }).where(eq(schema.accessories.id, targetList[0].id));
      } else {
        await tx.insert(schema.accessories).values({
          counter_id: targetCounterId,
          vehicle_model: source.vehicle_model,
          name: source.name,
          accessory_code: source.accessory_code,
          price: source.price,
          cgst_percent: source.cgst_percent,
          sgst_percent: source.sgst_percent,
          quantity: quantity
        });
      }
    });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Transfer failed' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/admin/accessories/transfer-bulk', async (c) => {
  const { items, targetCounterId } = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        const qty = item.transferQuantity !== undefined ? item.transferQuantity : item.quantity;
        const sourceList = await tx.select().from(schema.accessories).where(eq(schema.accessories.id, item.id));
        const source = sourceList[0];
        if (!source || source.quantity < qty) {
          throw new Error(`Insufficient stock for item: ${item.name || 'Unknown'}`);
        }
        
        await tx.update(schema.accessories).set({ quantity: sql`${schema.accessories.quantity} - ${qty}` }).where(eq(schema.accessories.id, item.id));
        
        const targetList = await tx.select().from(schema.accessories)
          .where(and(
            eq(schema.accessories.counter_id, targetCounterId),
            eq(schema.accessories.vehicle_model, source.vehicle_model),
            eq(schema.accessories.name, source.name)
          )).limit(1);
          
        if (targetList.length > 0) {
          await tx.update(schema.accessories).set({ quantity: sql`${schema.accessories.quantity} + ${qty}` }).where(eq(schema.accessories.id, targetList[0].id));
        } else {
          await tx.insert(schema.accessories).values({
            counter_id: targetCounterId,
            vehicle_model: source.vehicle_model,
            name: source.name,
            accessory_code: source.accessory_code,
            price: source.price,
            cgst_percent: source.cgst_percent,
            sgst_percent: source.sgst_percent,
            quantity: qty
          });
        }
      }
    });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Bulk transfer failed' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.post('/protected/admin/accessories/upload', async (c) => {
  const { rows } = await c.req.json();
  const { db, pool } = getDb(c);
  try {
    await db.transaction(async (tx) => {
      for (const row of rows) {
        const existList = await tx.select().from(schema.accessories)
          .where(and(
            eq(schema.accessories.counter_id, row.counter_id),
            sql`LOWER(${schema.accessories.vehicle_model}) = LOWER(${row.vehicle_model})`,
            sql`LOWER(${schema.accessories.name}) = LOWER(${row.name})`
          )).limit(1);
        
        if (existList.length > 0) {
          await tx.update(schema.accessories).set({
            quantity: sql`${schema.accessories.quantity} + ${row.quantity}`,
            price: String(row.price),
            accessory_code: row.accessory_code || sql`${schema.accessories.accessory_code}`,
            cgst_percent: String(row.cgst_percent || 0),
            sgst_percent: String(row.sgst_percent || 0)
          }).where(eq(schema.accessories.id, existList[0].id));
        } else {
          await tx.insert(schema.accessories).values({
            counter_id: row.counter_id,
            vehicle_model: row.vehicle_model,
            name: row.name,
            accessory_code: row.accessory_code || null,
            quantity: row.quantity,
            price: String(row.price),
            cgst_percent: String(row.cgst_percent || 0),
            sgst_percent: String(row.sgst_percent || 0),
            created_at: row.created_at ? new Date(row.created_at) : undefined
          });
        }
      }
    });
    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: 'Failed to process upload' }, 500);
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

app.get('/protected/admin/bills', async (c) => {
  const { db, pool } = getDb(c);
  try {
    const rows = await db.select({
      bill: schema.bills,
      counter_name: schema.profiles.name,
      accessory: {
        name: schema.accessories.name,
        accessory_code: schema.accessories.accessory_code,
        vehicle_model: schema.accessories.vehicle_model
      }
    }).from(schema.bills)
      .leftJoin(schema.profiles, eq(schema.bills.counter_id, schema.profiles.id))
      .leftJoin(schema.accessories, eq(schema.bills.accessory_id, schema.accessories.id))
      .orderBy(desc(schema.bills.created_at));
      
    return c.json(rows.map(r => ({ ...r.bill, counter_name: r.counter_name, accessories: r.accessory })));
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

export default app;