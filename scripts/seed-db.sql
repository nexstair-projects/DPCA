-- =============================================================
-- DPCA Seed Script — Run after auth accounts are created
-- Requires: Supabase Auth user UUIDs for the 3 team members
-- Execute via: supabase db query --linked -f scripts/seed-db.sql
-- =============================================================

-- INSTRUCTIONS:
-- 1. Create 3 auth accounts in Supabase dashboard (Auth > Users > Add user)
-- 2. Replace the UUIDs below with the actual auth.users UUIDs
-- 3. Run this script against the linked database

-- ========================
-- Step 1: Insert users
-- ========================
-- Replace these placeholder UUIDs with real ones from Supabase Auth dashboard

INSERT INTO users (auth_id, full_name, email, role)
VALUES
  ('754a61a2-a721-4d8f-860b-00b43f7a0ee0',  'Abdur Rehman',  'abdur@example.com',  'admin'),
  ('053ea3e7-2739-4248-a409-8dc430505a5e',  'Usama',         'usama@example.com',  'admin'),
  ('052f0207-c3c6-4873-aaf8-a96bf9a754d5',  'Client',        'client@example.com', 'manager')
ON CONFLICT (auth_id) DO NOTHING;

-- ========================
-- Step 2: Insert inbox
-- ========================

INSERT INTO inboxes (name, channel, email_address, assigned_users)
VALUES
  ('Dream Paris Main', 'gmail', 'contact@dreampariswedding.com',
   ARRAY[(SELECT id FROM users WHERE full_name = 'Client')]::uuid[]);

-- ========================
-- Step 3: Sample leads
-- ========================

INSERT INTO leads (client_names, email, source_channel, status, ai_summary)
VALUES
  ('Emma & James Holloway', 'emma.holloway@email.com', 'gmail', 'new',
   'UK couple planning June 2026 Paris wedding for 85 guests. Interested in full planning package with château venue.'),
  ('Sarah Chen', 'sarah.chen@email.com', 'instagram', 'contacted',
   'US-based bride looking for intimate elopement package, 15 guests, autumn 2026.');

-- ========================
-- Step 4: Sample messages
-- ========================

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
  'Hi there! My fiancé James and I are planning our dream wedding in Paris for June 2026. We are looking at around 85 guests and would love a château venue. Could you send us information about your full planning packages? We are based in London. Thank you, Emma',
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
  AND l.client_names = 'Emma & James Holloway'
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
  'Bonjour Sophie, Thank you for your inquiry. Château de Fleur is available on June 14-15, 2026. Our weekend package for 80-100 guests starts at €12,000. I have attached our updated brochure. Best regards, Pierre',
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
  'Hi! I came across your page and absolutely love your work. My partner and I are thinking about a small intimate ceremony in Paris this autumn - just us and about 15 close friends. Is that something you could help with? 💕',
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
  AND l.client_names = 'Sarah Chen'
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
  'Amélie Beaumont',
  'Collaboration Proposal - Wedding Photography',
  'Dear Dream Paris Wedding team, I am a Paris-based wedding photographer and would love to discuss a potential collaboration. I specialise in fine art wedding photography and have shot at many top Paris venues. Would you be open to a portfolio review meeting? Best, Amélie',
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

-- ========================
-- Step 5: Sample drafts
-- ========================

INSERT INTO drafts (message_id, draft_text, version, status, assigned_to, tone_confidence, model_used)
SELECT
  m.id,
  'Dear Emma,

What a wonderful vision — a château wedding in Paris next June sounds absolutely magical! With 85 guests and the elegance of a French château, we can already imagine the beautiful celebration you and James will have.

We would love to share our full planning packages with you. Our team specialises in exactly this kind of celebration, and we have wonderful relationships with several stunning château venues that would be perfect for your guest count.

Would you be available for a complimentary consultation call this week? We could walk you through our process, discuss venue options, and start bringing your Parisian wedding dream to life.

Warm regards,
Sophie Laurent
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
  'Hi Sarah! 💕

Thank you so much for reaching out — we absolutely love creating intimate celebrations in Paris!

A ceremony with 15 of your closest people sounds incredibly special. We have some beautiful intimate venue options that would be perfect for an autumn celebration — think golden Parisian light and cosy elegance.

Would you like to chat about what you have in mind? We would love to hear more about your vision!

Sophie
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

Thank you so much for confirming availability — that is wonderful news! The weekend package sounds very much in line with what our clients are looking for.

Could you also let us know about catering options and whether there is flexibility on the setup timing for a Saturday ceremony? We will review the brochure and follow up with more specific questions shortly.

Best regards,
Sophie Laurent
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

-- ========================
-- Step 6: Sample knowledge base
-- ========================

INSERT INTO knowledge_base (title, content, category, subcategory, created_by)
SELECT
  'Brand Voice Guide',
  'Dream Paris Wedding is a luxury destination wedding planning service. Our tone is warm, elegant, and personal — never corporate or pushy. We address clients by first name, write in first person plural, and always close with a clear next step.',
  'brand_voice',
  'tone_and_style',
  u.id
FROM users u WHERE u.full_name = 'Sophie Laurent' LIMIT 1;

INSERT INTO knowledge_base (title, content, category, subcategory, created_by)
SELECT
  'New Inquiry Response Template',
  'For new inquiries: Express genuine excitement about their vision. Reference specific details they mentioned (date, venue type, guest count). Offer a complimentary consultation call. Keep to 150-300 words for email, shorter for WhatsApp/Instagram.',
  'template',
  'new_inquiry_response',
  u.id
FROM users u WHERE u.full_name = 'Sophie Laurent' LIMIT 1;

INSERT INTO knowledge_base (title, content, category, subcategory, created_by)
SELECT
  'Paris Wedding Seasons FAQ',
  'Best seasons for Paris weddings: Spring (April-June) offers mild weather and blooming gardens. Summer (July-August) is warm but some vendors take holiday in August. Autumn (September-October) provides golden light and fewer crowds. Winter weddings are intimate and magical with holiday décor. Peak demand: May-June and September.',
  'faq',
  'seasons_and_timing',
  u.id
FROM users u WHERE u.full_name = 'Sophie Laurent' LIMIT 1;
