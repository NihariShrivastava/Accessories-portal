import { pgTable, text, timestamp, integer, numeric, jsonb, uuid } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull(),
  assigned_counters: jsonb('assigned_counters'),
  assigned_warehouses: text('assigned_warehouses').array(),
});

export const loginLogs = pgTable('login_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => profiles.id),
});

export const accessories = pgTable('accessories', {
  id: uuid('id').primaryKey().defaultRandom(),
  counter_id: uuid('counter_id').notNull().references(() => profiles.id),
  vehicle_model: text('vehicle_model').notNull(),
  name: text('name').notNull(),
  accessory_code: text('accessory_code'),
  price: numeric('price').notNull(),
  cgst_percent: numeric('cgst_percent').default('0'),
  sgst_percent: numeric('sgst_percent').default('0'),
  quantity: integer('quantity').notNull().default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const drawerTransactions = pgTable('drawer_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  counter_id: uuid('counter_id').notNull().references(() => profiles.id),
  transaction_type: text('transaction_type').notNull(),
  amount: numeric('amount').notNull(),
  status: text('status'),
  category: text('category'),
  details: text('details'),
  bank_name: text('bank_name'),
  account_number: text('account_number'),
  ifsc_code: text('ifsc_code'),
  created_at: timestamp('created_at').defaultNow(),
});

export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  bill_number: text('bill_number'),
  counter_id: uuid('counter_id').notNull().references(() => profiles.id),
  accessory_id: uuid('accessory_id').notNull().references(() => accessories.id),
  chassis_number: text('chassis_number'),
  engine_number: text('engine_number'),
  checklist_number: text('checklist_number'),
  customer_name: text('customer_name'),
  customer_phone: text('customer_phone'),
  customer_id: text('customer_id'),
  quantity: integer('quantity'),
  base_amount: numeric('base_amount'),
  cgst_amount: numeric('cgst_amount'),
  sgst_amount: numeric('sgst_amount'),
  total_amount: numeric('total_amount'),
  payment_method: text('payment_method'),
  payment_details: jsonb('payment_details'),
  amount_paid: numeric('amount_paid'),
  amount_left: numeric('amount_left'),
  approval_status: text('approval_status'),
  created_at: timestamp('created_at').defaultNow(),
});
