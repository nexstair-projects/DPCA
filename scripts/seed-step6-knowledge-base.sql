-- Step 6: Sample knowledge base
INSERT INTO knowledge_base (title, content, category, subcategory, created_by)
SELECT
  'Brand Voice Guide',
  'Dream Paris Wedding is a luxury destination wedding planning service. Our tone is warm, elegant, and personal - never corporate or pushy. We address clients by first name, write in first person plural, and always close with a clear next step.',
  'brand_voice',
  'tone_and_style',
  u.id
FROM users u WHERE u.full_name = 'Client' LIMIT 1;

INSERT INTO knowledge_base (title, content, category, subcategory, created_by)
SELECT
  'New Inquiry Response Template',
  'For new inquiries: Express genuine excitement about their vision. Reference specific details they mentioned (date, venue type, guest count). Offer a complimentary consultation call. Keep to 150-300 words for email, shorter for WhatsApp/Instagram.',
  'template',
  'new_inquiry_response',
  u.id
FROM users u WHERE u.full_name = 'Client' LIMIT 1;

INSERT INTO knowledge_base (title, content, category, subcategory, created_by)
SELECT
  'Paris Wedding Seasons FAQ',
  'Best seasons for Paris weddings: Spring (April-June) offers mild weather and blooming gardens. Summer (July-August) is warm but some vendors take holiday in August. Autumn (September-October) provides golden light and fewer crowds. Winter weddings are intimate and magical with holiday decor. Peak demand: May-June and September.',
  'faq',
  'seasons_and_timing',
  u.id
FROM users u WHERE u.full_name = 'Client' LIMIT 1;
