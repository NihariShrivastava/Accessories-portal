-- =============================================================================
-- CREATE ALL AUTH USERS MATCHING PROFILES
-- Run this in the Supabase SQL Editor.
-- This creates the login accounts for all counters, team leads, admin, cashiers, auditors.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- User: asc-narayannagar-sr (counter) -> asc-narayannagar-sr@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-narayannagar-sr@portal.com' OR id = '00c0456e-f8aa-4409-a9ab-8b58ece0584b';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00c0456e-f8aa-4409-a9ab-8b58ece0584b',
  'authenticated',
  'authenticated',
  'asc-narayannagar-sr@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-narayannagar-sr","role":"counter","username":"asc-narayannagar-sr","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00c0456e-f8aa-4409-a9ab-8b58ece0584b',
  '00c0456e-f8aa-4409-a9ab-8b58ece0584b',
  format('{"sub":"%s","email":"%s"}', '00c0456e-f8aa-4409-a9ab-8b58ece0584b', 'asc-narayannagar-sr@portal.com')::jsonb,
  'email',
  '00c0456e-f8aa-4409-a9ab-8b58ece0584b',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-airportroad-ws (counter) -> asc-airportroad-ws@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-airportroad-ws@portal.com' OR id = '1eb13d5b-7c0e-4867-8033-2c2839d6c988';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '1eb13d5b-7c0e-4867-8033-2c2839d6c988',
  'authenticated',
  'authenticated',
  'asc-airportroad-ws@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-airportroad-ws","role":"counter","username":"asc-airportroad-ws","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '1eb13d5b-7c0e-4867-8033-2c2839d6c988',
  '1eb13d5b-7c0e-4867-8033-2c2839d6c988',
  format('{"sub":"%s","email":"%s"}', '1eb13d5b-7c0e-4867-8033-2c2839d6c988', 'asc-airportroad-ws@portal.com')::jsonb,
  'email',
  '1eb13d5b-7c0e-4867-8033-2c2839d6c988',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-narayannagar-ws (counter) -> asc-narayannagar-ws@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-narayannagar-ws@portal.com' OR id = '1fdbe377-1362-4be1-a961-a275177cdad8';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '1fdbe377-1362-4be1-a961-a275177cdad8',
  'authenticated',
  'authenticated',
  'asc-narayannagar-ws@portal.com',
  crypt('1234567', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-narayannagar-ws","role":"counter","username":"asc-narayannagar-ws","password":"1234567"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '1fdbe377-1362-4be1-a961-a275177cdad8',
  '1fdbe377-1362-4be1-a961-a275177cdad8',
  format('{"sub":"%s","email":"%s"}', '1fdbe377-1362-4be1-a961-a275177cdad8', 'asc-narayannagar-ws@portal.com')::jsonb,
  'email',
  '1fdbe377-1362-4be1-a961-a275177cdad8',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: varsha (billing_counter) -> varsha@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'varsha@portal.com' OR id = '39300f59-a7ae-4e27-a832-1a3fb4a8aeef';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '39300f59-a7ae-4e27-a832-1a3fb4a8aeef',
  'authenticated',
  'authenticated',
  'varsha@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"varsha","role":"billing_counter","username":"varsha","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '39300f59-a7ae-4e27-a832-1a3fb4a8aeef',
  '39300f59-a7ae-4e27-a832-1a3fb4a8aeef',
  format('{"sub":"%s","email":"%s"}', '39300f59-a7ae-4e27-a832-1a3fb4a8aeef', 'varsha@portal.com')::jsonb,
  'email',
  '39300f59-a7ae-4e27-a832-1a3fb4a8aeef',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: cashier-assecsory-bhopal (cashier) -> cashier-assecsory-bhopal@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'cashier-assecsory-bhopal@portal.com' OR id = '4314ec89-2949-4827-99b4-e7a4c2d97410';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '4314ec89-2949-4827-99b4-e7a4c2d97410',
  'authenticated',
  'authenticated',
  'cashier-assecsory-bhopal@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"cashier-assecsory-bhopal","role":"cashier","username":"cashier-assecsory-bhopal","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '4314ec89-2949-4827-99b4-e7a4c2d97410',
  '4314ec89-2949-4827-99b4-e7a4c2d97410',
  format('{"sub":"%s","email":"%s"}', '4314ec89-2949-4827-99b4-e7a4c2d97410', 'cashier-assecsory-bhopal@portal.com')::jsonb,
  'email',
  '4314ec89-2949-4827-99b4-e7a4c2d97410',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-vidhisha-sr (counter) -> asc-vidhisha-sr@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-vidhisha-sr@portal.com' OR id = '45ed4cb3-3518-4e93-b0f1-bfb58d44730b';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '45ed4cb3-3518-4e93-b0f1-bfb58d44730b',
  'authenticated',
  'authenticated',
  'asc-vidhisha-sr@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-vidhisha-sr","role":"counter","username":"asc-vidhisha-sr","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '45ed4cb3-3518-4e93-b0f1-bfb58d44730b',
  '45ed4cb3-3518-4e93-b0f1-bfb58d44730b',
  format('{"sub":"%s","email":"%s"}', '45ed4cb3-3518-4e93-b0f1-bfb58d44730b', 'asc-vidhisha-sr@portal.com')::jsonb,
  'email',
  '45ed4cb3-3518-4e93-b0f1-bfb58d44730b',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-raisenroad-sr (counter) -> asc-raisenroad-sr@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-raisenroad-sr@portal.com' OR id = '64ddeca6-67f2-486b-b40e-82384b13fe8d';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '64ddeca6-67f2-486b-b40e-82384b13fe8d',
  'authenticated',
  'authenticated',
  'asc-raisenroad-sr@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-raisenroad-sr","role":"counter","username":"asc-raisenroad-sr","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '64ddeca6-67f2-486b-b40e-82384b13fe8d',
  '64ddeca6-67f2-486b-b40e-82384b13fe8d',
  format('{"sub":"%s","email":"%s"}', '64ddeca6-67f2-486b-b40e-82384b13fe8d', 'asc-raisenroad-sr@portal.com')::jsonb,
  'email',
  '64ddeca6-67f2-486b-b40e-82384b13fe8d',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-skc-sr (counter) -> asc-skc-sr@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-skc-sr@portal.com' OR id = '8a39ddbb-a28e-4bd1-882d-90bd92e0c103';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '8a39ddbb-a28e-4bd1-882d-90bd92e0c103',
  'authenticated',
  'authenticated',
  'asc-skc-sr@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-skc-sr","role":"counter","username":"asc-skc-sr","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '8a39ddbb-a28e-4bd1-882d-90bd92e0c103',
  '8a39ddbb-a28e-4bd1-882d-90bd92e0c103',
  format('{"sub":"%s","email":"%s"}', '8a39ddbb-a28e-4bd1-882d-90bd92e0c103', 'asc-skc-sr@portal.com')::jsonb,
  'email',
  '8a39ddbb-a28e-4bd1-882d-90bd92e0c103',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: auditor (auditor) -> auditor@auditor.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'auditor@auditor.com' OR id = 'bb768122-a080-46cc-b7e4-d28263ef94ac';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'bb768122-a080-46cc-b7e4-d28263ef94ac',
  'authenticated',
  'authenticated',
  'auditor@auditor.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"auditor","role":"auditor","username":"auditor","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'bb768122-a080-46cc-b7e4-d28263ef94ac',
  'bb768122-a080-46cc-b7e4-d28263ef94ac',
  format('{"sub":"%s","email":"%s"}', 'bb768122-a080-46cc-b7e4-d28263ef94ac', 'auditor@auditor.com')::jsonb,
  'email',
  'bb768122-a080-46cc-b7e4-d28263ef94ac',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-raisenroad-ws (counter) -> asc-raisenroad-ws@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-raisenroad-ws@portal.com' OR id = 'c54134f7-96aa-4971-b18d-71792b2cc955';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'c54134f7-96aa-4971-b18d-71792b2cc955',
  'authenticated',
  'authenticated',
  'asc-raisenroad-ws@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-raisenroad-ws","role":"counter","username":"asc-raisenroad-ws","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'c54134f7-96aa-4971-b18d-71792b2cc955',
  'c54134f7-96aa-4971-b18d-71792b2cc955',
  format('{"sub":"%s","email":"%s"}', 'c54134f7-96aa-4971-b18d-71792b2cc955', 'asc-raisenroad-ws@portal.com')::jsonb,
  'email',
  'c54134f7-96aa-4971-b18d-71792b2cc955',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: w-bpl (warehouse) -> w-bpl@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'w-bpl@portal.com' OR id = 'd436cf39-68f6-4b8d-8dae-e84e588cd1f7';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd436cf39-68f6-4b8d-8dae-e84e588cd1f7',
  'authenticated',
  'authenticated',
  'w-bpl@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"w-bpl","role":"warehouse","username":"w-bpl","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'd436cf39-68f6-4b8d-8dae-e84e588cd1f7',
  'd436cf39-68f6-4b8d-8dae-e84e588cd1f7',
  format('{"sub":"%s","email":"%s"}', 'd436cf39-68f6-4b8d-8dae-e84e588cd1f7', 'w-bpl@portal.com')::jsonb,
  'email',
  'd436cf39-68f6-4b8d-8dae-e84e588cd1f7',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-vidhisha-ws (counter) -> asc-vidhisha-ws@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-vidhisha-ws@portal.com' OR id = 'd5df49d2-a953-422f-b6a7-328a78a27c56';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd5df49d2-a953-422f-b6a7-328a78a27c56',
  'authenticated',
  'authenticated',
  'asc-vidhisha-ws@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-vidhisha-ws","role":"counter","username":"asc-vidhisha-ws","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'd5df49d2-a953-422f-b6a7-328a78a27c56',
  'd5df49d2-a953-422f-b6a7-328a78a27c56',
  format('{"sub":"%s","email":"%s"}', 'd5df49d2-a953-422f-b6a7-328a78a27c56', 'asc-vidhisha-ws@portal.com')::jsonb,
  'email',
  'd5df49d2-a953-422f-b6a7-328a78a27c56',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: Admin (admin) -> admin@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'admin@portal.com' OR id = 'e0889807-f4c9-4fa7-bc5d-e81b7715e94f';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'e0889807-f4c9-4fa7-bc5d-e81b7715e94f',
  'authenticated',
  'authenticated',
  'admin@portal.com',
  crypt('admin@2468', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Admin","role":"admin","username":"Admin","password":"admin@2468"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'e0889807-f4c9-4fa7-bc5d-e81b7715e94f',
  'e0889807-f4c9-4fa7-bc5d-e81b7715e94f',
  format('{"sub":"%s","email":"%s"}', 'e0889807-f4c9-4fa7-bc5d-e81b7715e94f', 'admin@portal.com')::jsonb,
  'email',
  'e0889807-f4c9-4fa7-bc5d-e81b7715e94f',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: w-gwl (warehouse) -> w-gwl@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'w-gwl@portal.com' OR id = 'eb4ef0e6-8aa8-4275-8e18-5d10a23269bf';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'eb4ef0e6-8aa8-4275-8e18-5d10a23269bf',
  'authenticated',
  'authenticated',
  'w-gwl@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"w-gwl","role":"warehouse","username":"w-gwl","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'eb4ef0e6-8aa8-4275-8e18-5d10a23269bf',
  'eb4ef0e6-8aa8-4275-8e18-5d10a23269bf',
  format('{"sub":"%s","email":"%s"}', 'eb4ef0e6-8aa8-4275-8e18-5d10a23269bf', 'w-gwl@portal.com')::jsonb,
  'email',
  'eb4ef0e6-8aa8-4275-8e18-5d10a23269bf',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: siya (team_lead) -> siya@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'siya@portal.com' OR id = 'f0ea6d32-8f81-4d82-8a61-8f9b8e0497f9';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'f0ea6d32-8f81-4d82-8a61-8f9b8e0497f9',
  'authenticated',
  'authenticated',
  'siya@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"siya","role":"team_lead","username":"siya","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'f0ea6d32-8f81-4d82-8a61-8f9b8e0497f9',
  'f0ea6d32-8f81-4d82-8a61-8f9b8e0497f9',
  format('{"sub":"%s","email":"%s"}', 'f0ea6d32-8f81-4d82-8a61-8f9b8e0497f9', 'siya@portal.com')::jsonb,
  'email',
  'f0ea6d32-8f81-4d82-8a61-8f9b8e0497f9',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- User: asc-airportroad-sr (counter) -> asc-airportroad-sr@portal.com
-- -----------------------------------------------------------------------------
DELETE FROM auth.users WHERE email = 'asc-airportroad-sr@portal.com' OR id = 'fbece8e5-6694-463d-a937-a90bd3a2975e';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'fbece8e5-6694-463d-a937-a90bd3a2975e',
  'authenticated',
  'authenticated',
  'asc-airportroad-sr@portal.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"asc-airportroad-sr","role":"counter","username":"asc-airportroad-sr","password":"123456"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'fbece8e5-6694-463d-a937-a90bd3a2975e',
  'fbece8e5-6694-463d-a937-a90bd3a2975e',
  format('{"sub":"%s","email":"%s"}', 'fbece8e5-6694-463d-a937-a90bd3a2975e', 'asc-airportroad-sr@portal.com')::jsonb,
  'email',
  'fbece8e5-6694-463d-a937-a90bd3a2975e',
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;
