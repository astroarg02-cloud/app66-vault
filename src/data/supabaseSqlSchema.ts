export const SUPABASE_AUTHORIZED_ADMIN_EMAIL = 'astroarg02@gmail.com';

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SERVIDOR PRIVADO: BÓVEDA DE CONTENIDO EXCLUSIVO
-- BASE DE DATOS SUPABASE (POSTGRESQL + ROW LEVEL SECURITY)
-- REGLA ESTRICTA: Solo astroarg02@gmail.com posee privilegios de Administrador.
-- ==============================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. TABLA: profiles (Perfiles de miembros vinculados a auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vip_member' CHECK (role IN ('admin', 'vip_member')),
  tier TEXT NOT NULL DEFAULT 'Acceso VIP' CHECK (tier IN ('Bóveda Diamante', 'Acceso VIP', 'Invitado')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: vault_items (Recursos de la Bóveda Privada)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('video', 'document', 'audio', 'preset', 'code')),
  file_type TEXT NOT NULL,
  file_size TEXT NOT NULL,
  download_url TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  likes_count INTEGER NOT NULL DEFAULT 0,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Administrador Root',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- 4. TABLA: vault_comments (Foro de debate privado por recurso)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vault_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_item_id UUID REFERENCES public.vault_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'vip_member',
  user_tier TEXT NOT NULL DEFAULT 'Acceso VIP',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: vault_likes (Registro de likes por usuario y recurso)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vault_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_item_id UUID REFERENCES public.vault_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(vault_item_id, user_id)
);

-- ==============================================================================
-- 6. FUNCIONES DE SEGURIDAD & PROCEDIMIENTOS ALMACENADOS
-- ==============================================================================

-- Función para verificar si el usuario autenticado es el Administrador Único Autorizado
CREATE OR REPLACE FUNCTION public.is_authorized_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'astroarg02@gmail.com'
    OR LOWER((SELECT email FROM auth.users WHERE id = auth.uid())) = 'astroarg02@gmail.com'
  );
$$;

-- Trigger para sincronizar automáticamente auth.users con public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Evaluar si el correo es el administrador único
  is_admin := LOWER(NEW.email) = 'astroarg02@gmail.com';

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    role,
    tier,
    avatar_url,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    CASE WHEN is_admin THEN 'admin' ELSE 'vip_member' END,
    CASE WHEN is_admin THEN 'Bóveda Diamante' ELSE 'Acceso VIP' END,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = CASE WHEN LOWER(EXCLUDED.email) = 'astroarg02@gmail.com' THEN 'admin' ELSE profiles.role END,
    tier = CASE WHEN LOWER(EXCLUDED.email) = 'astroarg02@gmail.com' THEN 'Bóveda Diamante' ELSE profiles.tier END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Vincular trigger al registro de Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar contador de likes automáticamente
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.vault_items
    SET likes_count = likes_count + 1
    WHERE id = NEW.vault_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.vault_items
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.vault_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_vault_like_change ON public.vault_likes;
CREATE TRIGGER on_vault_like_change
  AFTER INSERT OR DELETE ON public.vault_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();

-- ==============================================================================
-- 7. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_likes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: profiles
-- ------------------------------------------------------------------------------
-- Lectura: Cualquier usuario autenticado puede ver los perfiles de la comunidad
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualización: Cada usuario puede actualizar su propio perfil, pero solo el Admin puede cambiar roles
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      OR public.is_authorized_admin()
    )
  );

-- ------------------------------------------------------------------------------
-- RLS: vault_items (RECURSOS DE LA BÓVEDA)
-- ------------------------------------------------------------------------------
-- Lectura: Todos los miembros autenticados tienen acceso a ver y consultar el contenido
CREATE POLICY "vault_items_read_authenticated"
  ON public.vault_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Creación: EXCLUSIVA de astroarg02@gmail.com
CREATE POLICY "vault_items_insert_admin_only"
  ON public.vault_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_admin());

-- Modificación: EXCLUSIVA de astroarg02@gmail.com
CREATE POLICY "vault_items_update_admin_only"
  ON public.vault_items
  FOR UPDATE
  TO authenticated
  USING (public.is_authorized_admin())
  WITH CHECK (public.is_authorized_admin());

-- Eliminación: EXCLUSIVA de astroarg02@gmail.com
CREATE POLICY "vault_items_delete_admin_only"
  ON public.vault_items
  FOR DELETE
  TO authenticated
  USING (public.is_authorized_admin());

-- ------------------------------------------------------------------------------
-- RLS: vault_comments (FORO PRIVADO)
-- ------------------------------------------------------------------------------
-- Lectura: Cualquier miembro autenticado puede leer los comentarios
CREATE POLICY "vault_comments_read_authenticated"
  ON public.vault_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Creación: Cualquier miembro autenticado puede comentar con su propio user_id
CREATE POLICY "vault_comments_insert_own"
  ON public.vault_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Eliminación: Solo el autor del comentario o el Administrador Único
CREATE POLICY "vault_comments_delete_author_or_admin"
  ON public.vault_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_authorized_admin());

-- ------------------------------------------------------------------------------
-- RLS: vault_likes (INTERACCIÓN)
-- ------------------------------------------------------------------------------
-- Lectura: Cualquier miembro autenticado
CREATE POLICY "vault_likes_read_authenticated"
  ON public.vault_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Dar like: El usuario solo puede insertar su propio like
CREATE POLICY "vault_likes_insert_own"
  ON public.vault_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Quitar like: El usuario solo puede borrar su propio like
CREATE POLICY "vault_likes_delete_own"
  ON public.vault_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 8. CONFIGURACIÓN DE SUPABASE STORAGE (BUCKET: vault_files)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault_files', 'vault_files', false)
ON CONFLICT (id) DO NOTHING;

-- Lectura/Descarga de Storage: Miembros autenticados
CREATE POLICY "vault_storage_read_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'vault_files');

-- Subida/Edición/Borrado de Storage: Solo astroarg02@gmail.com
CREATE POLICY "vault_storage_upload_admin_only"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vault_files' 
    AND public.is_authorized_admin()
  );

CREATE POLICY "vault_storage_delete_admin_only"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vault_files' 
    AND public.is_authorized_admin()
  );

-- ==============================================================================
-- 9. DATOS INICIALES SEMILLA (SEED DATA)
-- ==============================================================================
-- Inserta recursos de ejemplo en la Bóveda Privada
INSERT INTO public.vault_items (
  title,
  description,
  category,
  file_type,
  file_size,
  download_url,
  cover_image,
  version,
  author_name
)
VALUES
(
  'Masterclass: Clean Architecture & Modular State Management',
  'Sesión técnica profunda de 2 horas sobre separación de capas, inyección de dependencias, gestión reactiva de estado y manejo seguro de tokens en el servidor.',
  'video',
  'MP4 4K UHD',
  '1.85 GB',
  'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41551-large.mp4',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
  'v2.4.0',
  'Administrador (astroarg02)'
),
(
  'Kit de Seguridad: Reglas de Firestore & Database Hardening',
  'Colección completa de políticas de seguridad a nivel de fila (RLS), scripts de verificación de tokens JWT y blueprints de infraestructura cerrada para producción.',
  'document',
  'PDF / Markdown Suite',
  '14.2 MB',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
  'v1.1.0',
  'Administrador (astroarg02)'
),
(
  'Motor de Descargas Asíncrono & Background Worker',
  'Paquete modular con gestión de descargas reanudables en segundo plano, cálculo de Hash SHA-256 para integridad de archivos y notificaciones.',
  'code',
  'ZIP Source Code',
  '45.8 MB',
  'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41551-large.mp4',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
  'v3.0.2',
  'Administrador (astroarg02)'
)
ON CONFLICT DO NOTHING;
`;
