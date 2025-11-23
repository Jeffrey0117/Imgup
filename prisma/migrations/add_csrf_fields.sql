-- Migration: Add CSRF token fields to AdminSession table
-- Date: 2024-11-24
-- Description: Adds csrfToken and csrfSignature columns to support CSRF protection

-- Add CSRF token fields to AdminSession table
ALTER TABLE "AdminSession"
ADD COLUMN IF NOT EXISTS "csrfToken" TEXT,
ADD COLUMN IF NOT EXISTS "csrfSignature" TEXT;

-- Optional: Add comment to explain the columns
COMMENT ON COLUMN "AdminSession"."csrfToken" IS 'CSRF token for protecting against cross-site request forgery';
COMMENT ON COLUMN "AdminSession"."csrfSignature" IS 'HMAC signature of the CSRF token for additional security';
