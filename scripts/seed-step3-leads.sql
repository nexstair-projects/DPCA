-- Step 3: Sample leads
INSERT INTO leads (client_names, email, source_channel, status, ai_summary)
VALUES
  (ARRAY['Emma and James Holloway'], 'emma.holloway@email.com', 'gmail', 'new',
   'UK couple planning June 2026 Paris wedding for 85 guests. Interested in full planning package with chateau venue.'),
  (ARRAY['Sarah Chen'], 'sarah.chen@email.com', 'instagram', 'contacted',
   'US-based bride looking for intimate elopement package, 15 guests, autumn 2026.');
