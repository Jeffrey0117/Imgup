-- 新增會員系統資料表

-- User 表
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "username" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'guest',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "lastWarningAt" TIMESTAMP(3),
    "restrictedUntil" TIMESTAMP(3),
    "blacklistedAt" TIMESTAMP(3),
    "blacklistReason" TEXT,
    "totalUploads" INTEGER NOT NULL DEFAULT 0,
    "lastUploadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_tier_idx" ON "User"("tier");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- UserSession 表
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "refreshToken" TEXT NOT NULL UNIQUE,
    "userAgent" TEXT,
    "ipAddress" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserSession_token_idx" ON "UserSession"("token");
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");

-- RateViolation 表
CREATE TABLE IF NOT EXISTS "RateViolation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "violationType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RateViolation_userId_idx" ON "RateViolation"("userId");
CREATE INDEX IF NOT EXISTS "RateViolation_ipAddress_idx" ON "RateViolation"("ipAddress");
CREATE INDEX IF NOT EXISTS "RateViolation_createdAt_idx" ON "RateViolation"("createdAt");
CREATE INDEX IF NOT EXISTS "RateViolation_violationType_idx" ON "RateViolation"("violationType");

-- Mapping 表新增欄位
ALTER TABLE "Mapping" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Mapping" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;

CREATE INDEX IF NOT EXISTS "Mapping_userId_idx" ON "Mapping"("userId");

-- 新增外鍵約束 (如果不存在)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Mapping_userId_fkey'
    ) THEN
        ALTER TABLE "Mapping" ADD CONSTRAINT "Mapping_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;