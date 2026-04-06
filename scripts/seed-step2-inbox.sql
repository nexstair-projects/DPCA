-- Step 2: Insert inbox
INSERT INTO inboxes (name, channel, email_address, assigned_users)
VALUES
  ('Dream Paris Main', 'gmail', 'contact@dreampariswedding.com',
   ARRAY[(SELECT id FROM users WHERE full_name = 'Client')]::uuid[]);
