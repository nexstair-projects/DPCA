-- Add unique constraint on knowledge_base.title to support upsert in kb-import script
ALTER TABLE knowledge_base ADD CONSTRAINT knowledge_base_title_unique UNIQUE (title);
