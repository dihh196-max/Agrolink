ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cover_url" text,
  ADD COLUMN IF NOT EXISTS "city" varchar(100),
  ADD COLUMN IF NOT EXISTS "state" varchar(2),
  ADD COLUMN IF NOT EXISTS "occupation" varchar(100),
  ADD COLUMN IF NOT EXISTS "experience_years" text,
  ADD COLUMN IF NOT EXISTS "cultures" text,
  ADD COLUMN IF NOT EXISTS "website" varchar(255),
  ADD COLUMN IF NOT EXISTS "instagram" varchar(50),
  ADD COLUMN IF NOT EXISTS "birth_date" text;
