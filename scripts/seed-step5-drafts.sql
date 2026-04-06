-- Step 5: Sample drafts
INSERT INTO drafts (message_id, draft_text, version, status, assigned_to, tone_confidence, model_used)
SELECT
  m.id,
  'Dear Emma,

What a wonderful vision - a chateau wedding in Paris next June sounds absolutely magical! With 85 guests and the elegance of a French chateau, we can already imagine the beautiful celebration you and James will have.

We would love to share our full planning packages with you. Our team specialises in exactly this kind of celebration, and we have wonderful relationships with several stunning chateau venues that would be perfect for your guest count.

Would you be available for a complimentary consultation call this week? We could walk you through our process, discuss venue options, and start bringing your Parisian wedding dream to life.

Warm regards,
Client
Dream Paris Wedding',
  1,
  'pending_review',
  u.id,
  88,
  'gpt-4o'
FROM messages m, users u
WHERE m.message_external_id = 'ext-msg-001'
  AND u.full_name = 'Client'
LIMIT 1;

INSERT INTO drafts (message_id, draft_text, version, status, assigned_to, tone_confidence, model_used)
SELECT
  m.id,
  'Hi Sarah!

Thank you so much for reaching out - we absolutely love creating intimate celebrations in Paris!

A ceremony with 15 of your closest people sounds incredibly special. We have some beautiful intimate venue options that would be perfect for an autumn celebration - think golden Parisian light and cosy elegance.

Would you like to chat about what you have in mind? We would love to hear more about your vision!

Best,
Client
Dream Paris Wedding',
  1,
  'auto_approved',
  u.id,
  92,
  'gpt-4o'
FROM messages m, users u
WHERE m.message_external_id = 'ext-msg-003'
  AND u.full_name = 'Client'
LIMIT 1;

INSERT INTO drafts (message_id, draft_text, version, status, assigned_to, tone_confidence, model_used)
SELECT
  m.id,
  'Dear Pierre,

Thank you so much for confirming availability - that is wonderful news! The weekend package sounds very much in line with what our clients are looking for.

Could you also let us know about catering options and whether there is flexibility on the setup timing for a Saturday ceremony? We will review the brochure and follow up with more specific questions shortly.

Best regards,
Client
Dream Paris Wedding',
  1,
  'sent',
  u.id,
  85,
  'gpt-4o'
FROM messages m, users u
WHERE m.message_external_id = 'ext-msg-002'
  AND u.full_name = 'Client'
LIMIT 1;
