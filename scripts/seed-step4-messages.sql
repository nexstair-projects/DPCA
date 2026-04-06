-- Step 4: Sample messages
INSERT INTO messages (
  inbox_id, message_external_id, sender_email, sender_name, subject,
  body_raw, channel, category, priority, tier,
  classification_confidence, classification_status, status, lead_id
)
SELECT
  i.id,
  'ext-msg-001',
  'emma.holloway@email.com',
  'Emma Holloway',
  'Wedding Inquiry - June 2026',
  'Hi there! My fiancé James and I are planning our dream wedding in Paris for June 2026. We are looking at around 85 guests and would love a chateau venue. Could you send us information about your full planning packages? We are based in London. Thank you, Emma',
  'gmail',
  'new_inquiry',
  'high',
  3,
  0.94,
  'classified',
  'draft_ready',
  l.id
FROM inboxes i, leads l
WHERE i.name = 'Dream Paris Main'
  AND l.client_names = ARRAY['Emma and James Holloway']
LIMIT 1;

INSERT INTO messages (
  inbox_id, message_external_id, sender_email, sender_name, subject,
  body_raw, channel, category, priority, tier,
  classification_confidence, classification_status, status
)
SELECT
  i.id,
  'ext-msg-002',
  'pierre@chateaufleur.fr',
  'Pierre Duval',
  'RE: Availability June 14-15 2026',
  'Bonjour Sophie, Thank you for your inquiry. Chateau de Fleur is available on June 14-15, 2026. Our weekend package for 80-100 guests starts at EUR 12000. I have attached our updated brochure. Best regards, Pierre',
  'gmail',
  'vendor',
  'medium',
  2,
  0.91,
  'classified',
  'replied'
FROM inboxes i
WHERE i.name = 'Dream Paris Main'
LIMIT 1;

INSERT INTO messages (
  inbox_id, message_external_id, sender_email, sender_name, subject,
  body_raw, channel, category, priority, tier,
  classification_confidence, classification_status, status, lead_id
)
SELECT
  i.id,
  'ext-msg-003',
  'sarah.chen@email.com',
  'Sarah Chen',
  '',
  'Hi! I came across your page and absolutely love your work. My partner and I are thinking about a small intimate ceremony in Paris this autumn - just us and about 15 close friends. Is that something you could help with?',
  'instagram',
  'new_inquiry',
  'high',
  3,
  0.88,
  'classified',
  'draft_ready',
  l.id
FROM inboxes i, leads l
WHERE i.name = 'Dream Paris Main'
  AND l.client_names = ARRAY['Sarah Chen']
LIMIT 1;

INSERT INTO messages (
  inbox_id, message_external_id, sender_email, sender_name, subject,
  body_raw, channel, category, priority, tier,
  classification_confidence, classification_status, status
)
SELECT
  i.id,
  'ext-msg-004',
  'amelie.beaumont@photography.fr',
  'Amelie Beaumont',
  'Collaboration Proposal - Wedding Photography',
  'Dear Dream Paris Wedding team, I am a Paris-based wedding photographer and would love to discuss a potential collaboration. I specialise in fine art wedding photography and have shot at many top Paris venues. Would you be open to a portfolio review meeting? Best, Amelie',
  'gmail',
  'collaboration',
  'medium',
  2,
  0.87,
  'classified',
  'needs_human_reply'
FROM inboxes i
WHERE i.name = 'Dream Paris Main'
LIMIT 1;

INSERT INTO messages (
  inbox_id, message_external_id, sender_email, sender_name, subject,
  body_raw, channel, category, priority, tier,
  classification_confidence, classification_status, status
)
SELECT
  i.id,
  'ext-msg-005',
  'info@weddingblog.com',
  'Wedding Blog Admin',
  'Quick question about Paris wedding costs',
  'Hello, I am writing an article about destination weddings in Paris. Could you give me a general price range for your planning services? Also, what is the best time of year for a Paris wedding? Thank you!',
  'gmail',
  'general',
  'low',
  1,
  0.92,
  'classified',
  'received'
FROM inboxes i
WHERE i.name = 'Dream Paris Main'
LIMIT 1;
