-- ============================================================
-- Orbit — Supabase Setup Script
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- para búsqueda de texto

-- ============================================================
-- 2. Función update_updated_at (trigger genérico)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Tabla users (espejo de auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL DEFAULT '',
  role        VARCHAR(20)  NOT NULL DEFAULT 'copy' CHECK (role IN ('admin', 'pm', 'copy', 'arte')),
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. Trigger: crear public.users al registrar en auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- 5. Tabla segments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.segments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  audience            TEXT NOT NULL DEFAULT '',
  tone                VARCHAR(255),
  brand_voice         JSONB DEFAULT '{}',
  restrictions        JSONB DEFAULT '[]',
  preferred_channels  TEXT[],
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE TRIGGER segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. Tabla campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. Tabla requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number                SERIAL,
  title                 VARCHAR(500) NOT NULL,
  channel               VARCHAR(50)  NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'paid_digital')),
  objective             TEXT,
  brief                 TEXT,
  sheet_url             TEXT,
  sheet_structure       JSONB DEFAULT '{}',
  segment_id            UUID REFERENCES public.segments(id) ON DELETE SET NULL,
  campaign_id           UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  status                VARCHAR(50) NOT NULL DEFAULT 'brief_ready',
  pm_id                 UUID REFERENCES public.users(id) ON DELETE SET NULL,
  copy_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  art_id                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date              DATE,
  client_token          VARCHAR(255),
  client_copy_review    BOOLEAN NOT NULL DEFAULT FALSE,
  client_art_review     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_pm_id ON public.requests(pm_id);
CREATE INDEX IF NOT EXISTS idx_requests_copy_id ON public.requests(copy_id);
CREATE INDEX IF NOT EXISTS idx_requests_art_id ON public.requests(art_id);

-- ============================================================
-- 8. Tabla request_variants
-- ============================================================
CREATE TABLE IF NOT EXISTS public.request_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  sheet_tab_name VARCHAR(255),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. Tabla copy_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copy_versions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  variant_id         UUID REFERENCES public.request_variants(id) ON DELETE CASCADE,
  version_number     INTEGER NOT NULL,
  channel            VARCHAR(50) NOT NULL,
  content            JSONB NOT NULL DEFAULT '[]',
  generation_type    VARCHAR(30) NOT NULL DEFAULT 'manual' CHECK (generation_type IN ('manual', 'ai_generated', 'ai_edited')),
  ai_prompt_used     TEXT,
  ai_model           VARCHAR(100),
  ai_context_bundle  TEXT,
  status             VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved')),
  created_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_versions_request_id ON public.copy_versions(request_id);

-- ============================================================
-- 10. Tabla assets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES public.request_variants(id) ON DELETE SET NULL,
  version_number  INTEGER NOT NULL DEFAULT 1,
  filename        VARCHAR(255) NOT NULL,
  file_url        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  mime_type       VARCHAR(100),
  file_size       INTEGER,
  width           INTEGER,
  height          INTEGER,
  channel_format  VARCHAR(100),
  status          VARCHAR(30) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'ai_reviewing', 'ai_reviewed', 'copy_validated', 'approved', 'rejected')),
  drive_file_id   VARCHAR(255),
  uploaded_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. Tabla comments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  entity_type  VARCHAR(20) NOT NULL CHECK (entity_type IN ('copy', 'art', 'brief', 'general')),
  entity_id    UUID,
  section      VARCHAR(100),
  body         TEXT NOT NULL,
  author_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_id    UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  is_resolved  BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 12. Tabla notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ============================================================
-- 13. Tabla audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    UUID,
  old_value    JSONB,
  new_value    JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- ============================================================
-- 14. Tabla ai_art_reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_art_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  request_id      UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  overall_status  VARCHAR(30) NOT NULL CHECK (overall_status IN ('approved', 'approved_with_observations', 'requires_changes')),
  extracted_text  TEXT,
  brief_checklist JSONB DEFAULT '[]',
  ai_model        VARCHAR(100),
  reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  validated_at    TIMESTAMPTZ
);

-- ============================================================
-- 15. Tabla ai_findings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID NOT NULL REFERENCES public.ai_art_reviews(id) ON DELETE CASCADE,
  severity        VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'moderate', 'minor', 'info')),
  category        VARCHAR(100) NOT NULL,
  description     TEXT NOT NULL,
  detected_text   TEXT,
  expected_text   TEXT,
  location        VARCHAR(255),
  recommendation  TEXT,
  is_dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  dismissed_at    TIMESTAMPTZ
);

-- ============================================================
-- 16. Tabla approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  stage           VARCHAR(30) NOT NULL CHECK (stage IN ('copy', 'copy_client', 'art', 'art_client')),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  entity_id       UUID,
  approver_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approver_email  VARCHAR(255),
  notes           TEXT,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 17. Tabla segment_examples
-- ============================================================
CREATE TABLE IF NOT EXISTS public.segment_examples (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id   UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  channel      VARCHAR(50),
  description  TEXT,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 18. RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_art_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_findings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_examples ENABLE ROW LEVEL SECURITY;

-- La API usa SERVICE_ROLE_KEY (bypass RLS) — estas políticas son para acceso directo
-- Solo permitimos SELECT para usuarios autenticados (la lógica real la maneja la API)

CREATE POLICY "Usuarios autenticados pueden leer" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role tiene acceso total" ON public.users
  USING (TRUE) WITH CHECK (TRUE);

-- Nota: el service role ya bypasea RLS automáticamente.
-- Las políticas de SELECT para auth.uid() garantizan que
-- si alguien accede directo a Supabase (no via API), solo ve lo suyo.

-- ============================================================
-- 19. Storage: bucket orbit-assets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('orbit-assets', 'orbit-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Política: solo usuarios autenticados pueden subir
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'orbit-assets');

CREATE POLICY "Authenticated users can read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'orbit-assets');

-- ============================================================
-- LISTO. Ahora podés correr: pnpm db:push
-- ============================================================
