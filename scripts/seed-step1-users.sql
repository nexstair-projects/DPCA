-- Step 1: Insert users
INSERT INTO users (auth_id, full_name, email, role)
VALUES
  ('754a61a2-a721-4d8f-860b-00b43f7a0ee0',  'Abdur Rehman',  'abdur@example.com',  'admin'),
  ('053ea3e7-2739-4248-a409-8dc430505a5e',  'Usama',         'usama@example.com',  'admin'),
  ('052f0207-c3c6-4873-aaf8-a96bf9a754d5',  'Client',        'client@example.com', 'manager')
ON CONFLICT (auth_id) DO NOTHING;
