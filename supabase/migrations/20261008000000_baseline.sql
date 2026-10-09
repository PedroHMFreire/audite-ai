-- Baseline: estado do schema de produção em 2026-10-08.
-- Substitui as migrações anteriores, preservadas em supabase/migrations_legacy/
-- apenas como histórico (não são mais executadas pela CLI).


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_org_id    uuid;
  v_inv_id    uuid;
  v_disp_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT id, org_id INTO v_inv_id, v_org_id
  FROM public.organization_invitations
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > now();

  IF v_inv_id IS NULL THEN RAISE EXCEPTION 'Convite inválido ou expirado'; END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já pertence a uma organização';
  END IF;

  SELECT owner_name INTO v_disp_name FROM public.user_profiles WHERE id = auth.uid();

  INSERT INTO public.organization_members (org_id, user_id, role, display_name)
  VALUES (v_org_id, auth.uid(), 'member', COALESCE(v_disp_name, 'Membro'));

  UPDATE public.organization_invitations
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = v_inv_id;

  RETURN v_org_id;
END;
$$;


ALTER FUNCTION "public"."accept_invitation"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_manual_entry"("p_count_id" "uuid", "p_codigo" "text", "p_qty" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.manual_entries (count_id, codigo, qty)
  VALUES (p_count_id, p_codigo, GREATEST(1, COALESCE(p_qty, 1)))
  ON CONFLICT (count_id, codigo)
  DO UPDATE SET qty = public.manual_entries.qty + GREATEST(1, COALESCE(p_qty, 1));
END;
$$;


ALTER FUNCTION "public"."add_manual_entry"("p_count_id" "uuid", "p_codigo" "text", "p_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users_with_roles"() RETURNS TABLE("user_id" "uuid", "email" "text", "role" "text", "permissions" "text"[], "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuarios';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email,
    COALESCE(ur.role, 'user') AS role,
    COALESCE(ur.permissions, '{}'::text[]) AS permissions,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."admin_list_users_with_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_upsert_catalog"("p_items" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_org_id uuid;
  v_count  int;
BEGIN
  SELECT org_id INTO v_org_id FROM public.organization_members WHERE user_id = auth.uid();
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Você não pertence a nenhuma organização'; END IF;
  IF NOT public.is_org_admin() THEN RAISE EXCEPTION 'Apenas administradores podem atualizar o catálogo'; END IF;

  INSERT INTO public.product_catalog (org_id, codigo, nome, updated_at)
  SELECT v_org_id,
         trim(item->>'codigo'),
         COALESCE(NULLIF(trim(item->>'nome'), ''), ''),
         now()
  FROM jsonb_array_elements(p_items) item
  WHERE trim(item->>'codigo') <> ''
  ON CONFLICT (org_id, codigo)
  DO UPDATE SET nome = EXCLUDED.nome, updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."bulk_upsert_catalog"("p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_count_results"("p_count_id" "uuid") RETURNS TABLE("regular" integer, "falta" integer, "excesso" integer, "total" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Posse validada pelo RLS (INVOKER): se não for dono, nada é afetado.
  IF NOT EXISTS (
    SELECT 1 FROM public.counts c
    WHERE c.id = p_count_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para finalizar esta contagem';
  END IF;

  DELETE FROM public.results WHERE count_id = p_count_id;

  WITH plan AS (
    SELECT codigo, max(nome) AS nome, sum(saldo)::int AS saldo
    FROM public.plan_items WHERE count_id = p_count_id GROUP BY codigo
  ),
  man AS (
    SELECT codigo, sum(qty)::int AS qty
    FROM public.manual_entries WHERE count_id = p_count_id GROUP BY codigo
  ),
  joined AS (
    SELECT
      COALESCE(p.codigo, m.codigo) AS codigo,
      COALESCE(p.nome, '')         AS nome,
      COALESCE(p.saldo, 0)         AS saldo,
      COALESCE(m.qty, 0)           AS qty
    FROM plan p FULL OUTER JOIN man m ON m.codigo = p.codigo
  )
  INSERT INTO public.results (count_id, codigo, status, nome_produto, manual_qtd, saldo_qtd)
  SELECT
    p_count_id, codigo,
    CASE WHEN saldo = qty THEN 'regular'
         WHEN saldo > qty THEN 'falta'
         ELSE 'excesso' END,
    nome, qty, saldo
  FROM joined;

  UPDATE public.counts
  SET status = 'finalizada', finished_at = now()
  WHERE id = p_count_id;

  RETURN QUERY
    SELECT
      count(*) FILTER (WHERE r.status='regular')::int,
      count(*) FILTER (WHERE r.status='falta')::int,
      count(*) FILTER (WHERE r.status='excesso')::int,
      count(*)::int
    FROM public.results r WHERE r.count_id = p_count_id;
END;
$$;


ALTER FUNCTION "public"."compute_count_results"("p_count_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_org_id     uuid;
  v_disp_name  text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já pertence a uma organização';
  END IF;

  SELECT owner_name INTO v_disp_name FROM public.user_profiles WHERE id = auth.uid();

  INSERT INTO public.organizations (name, created_by)
  VALUES (trim(p_name), auth.uid())
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role, display_name)
  VALUES (v_org_id, auth.uid(), 'admin', COALESCE(v_disp_name, 'Admin'));

  RETURN v_org_id;
END;
$$;


ALTER FUNCTION "public"."create_organization"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_available_date"("p_start_date" "date", "p_week_offset" integer, "p_day_of_week" integer, "p_work_days" integer[]) RETURNS "date"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  base_date date;
  target_date date;
BEGIN
  -- Calcula data base da semana
  base_date := p_start_date + (p_week_offset * interval '7 days');
  
  -- Ajusta para segunda-feira da semana
  base_date := base_date - (extract(dow from base_date) - 1) * interval '1 day';
  
  -- Calcula data alvo
  target_date := base_date + (p_day_of_week - 1) * interval '1 day';
  
  -- Verifica se é dia útil permitido
  IF p_day_of_week = ANY(p_work_days) THEN
    RETURN target_date;
  ELSE
    -- Se não é dia útil, retorna NULL
    RETURN NULL;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_next_available_date"("p_start_date" "date", "p_week_offset" integer, "p_day_of_week" integer, "p_work_days" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.user_profiles (
    id,
    store_name,
    owner_name,
    phone,
    segment,
    plan,
    trial_start,
    trial_end,
    trial_active
  )
  values (
    new.id,
    new.raw_user_meta_data->>'store_name',
    new.raw_user_meta_data->>'owner_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'segment',
    new.raw_user_meta_data->>'plan',
    (new.raw_user_meta_data->>'trial_start')::timestamp with time zone,
    (new.raw_user_meta_data->>'trial_end')::timestamp with time zone,
    (new.raw_user_meta_data->>'trial_active')::boolean
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Insere role padrão 'user' para novos usuários
  insert into public.user_roles (user_id, role, permissions)
  values (new.id, 'user', '{}');
  
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$ SELECT EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE user_id = auth.uid() AND role = 'admin'
); $$;


ALTER FUNCTION "public"."is_org_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1; $$;


ALTER FUNCTION "public"."my_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "target_user_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "priority" integer DEFAULT 1,
    "color" "text" DEFAULT '#6B7280'::"text",
    "is_active" boolean DEFAULT true,
    "last_counted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "categories_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5)))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sectors_per_week" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "total_weeks" integer DEFAULT 4,
    "work_days" integer[] DEFAULT '{1,2,3,4,5}'::integer[],
    "is_active" boolean DEFAULT true,
    "generated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "schedule_configs_sectors_per_week_check" CHECK ((("sectors_per_week" >= 1) AND ("sectors_per_week" <= 10))),
    CONSTRAINT "schedule_configs_total_weeks_check" CHECK ((("total_weeks" >= 1) AND ("total_weeks" <= 52)))
);


ALTER TABLE "public"."schedule_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "week_number" integer NOT NULL,
    "day_of_week" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "count_id" "uuid",
    "notes" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "schedule_items_day_of_week_check" CHECK ((("day_of_week" >= 1) AND ("day_of_week" <= 7))),
    CONSTRAINT "schedule_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'skipped'::"text", 'rescheduled'::"text"]))),
    CONSTRAINT "schedule_items_week_number_check" CHECK (("week_number" >= 1))
);


ALTER TABLE "public"."schedule_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."category_stats" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."name",
    "c"."priority",
    "c"."last_counted_at",
    "count"("si"."id") AS "total_scheduled",
    "count"(
        CASE
            WHEN ("si"."status" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_count",
    "count"(
        CASE
            WHEN ("si"."status" = 'pending'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_count",
    "count"(
        CASE
            WHEN ("si"."status" = 'skipped'::"text") THEN 1
            ELSE NULL::integer
        END) AS "skipped_count",
    "sc"."user_id"
   FROM (("public"."categories" "c"
     LEFT JOIN "public"."schedule_items" "si" ON (("si"."category_id" = "c"."id")))
     LEFT JOIN "public"."schedule_configs" "sc" ON ((("sc"."id" = "si"."config_id") AND ("sc"."is_active" = true))))
  WHERE ("c"."is_active" = true)
  GROUP BY "c"."id", "c"."name", "c"."priority", "c"."last_counted_at", "sc"."user_id";


ALTER VIEW "public"."category_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."count_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid",
    "storage_path" "text",
    "original_name" "text",
    "parsed_at" timestamp with time zone
);


ALTER TABLE "public"."count_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "store_id" "uuid",
    "nome" "text" NOT NULL,
    "status" "text" DEFAULT 'EM ANDAMENTO'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone DEFAULT "now"(),
    "finished_at" timestamp with time zone
);


ALTER TABLE "public"."counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."divergence_justifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid" NOT NULL,
    "codigo" "text" NOT NULL,
    "motivo" "text" NOT NULL,
    "observacao" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "divergence_justifications_check" CHECK ((("motivo" <> 'outra'::"text") OR ("observacao" IS NOT NULL))),
    CONSTRAINT "divergence_justifications_motivo_check" CHECK (("motivo" = ANY (ARRAY['falha_troca'::"text", 'erro_insercao'::"text", 'duplicada_sistema'::"text", 'codigo_errado'::"text", 'outra'::"text"])))
);


ALTER TABLE "public"."divergence_justifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manual_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid",
    "codigo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "qty" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."manual_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note" "text",
    "accepted_at" timestamp with time zone,
    "accepted_by" "uuid",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "display_name" "text",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid",
    "codigo" "text" NOT NULL,
    "nome" "text",
    "saldo" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."plan_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "codigo" "text" NOT NULL,
    "nome" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid",
    "pdf_storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid",
    "codigo" "text" NOT NULL,
    "status" "text" NOT NULL,
    "manual_qtd" integer DEFAULT 0 NOT NULL,
    "saldo_qtd" integer DEFAULT 0 NOT NULL,
    "nome_produto" "text",
    CONSTRAINT "results_status_check" CHECK (("status" = ANY (ARRAY['regular'::"text", 'excesso'::"text", 'falta'::"text"])))
);


ALTER TABLE "public"."results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_item_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_date" "date",
    "new_date" "date",
    "reason" "text",
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "schedule_history_action_check" CHECK (("action" = ANY (ARRAY['created'::"text", 'rescheduled'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."schedule_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."upcoming_schedule" WITH ("security_invoker"='true') AS
 SELECT "si"."id",
    "si"."scheduled_date",
    "si"."status",
    "si"."week_number",
    "si"."day_of_week",
    "c"."name" AS "category_name",
    "c"."color" AS "category_color",
    "c"."priority",
    "sc"."name" AS "config_name",
    "sc"."user_id",
        CASE
            WHEN ("si"."scheduled_date" = CURRENT_DATE) THEN 'today'::"text"
            WHEN ("si"."scheduled_date" < CURRENT_DATE) THEN 'overdue'::"text"
            WHEN ("si"."scheduled_date" <= (CURRENT_DATE + '7 days'::interval)) THEN 'upcoming'::"text"
            ELSE 'future'::"text"
        END AS "urgency"
   FROM (("public"."schedule_items" "si"
     JOIN "public"."categories" "c" ON (("c"."id" = "si"."category_id")))
     JOIN "public"."schedule_configs" "sc" ON (("sc"."id" = "si"."config_id")))
  WHERE (("si"."status" = 'pending'::"text") AND ("sc"."is_active" = true) AND ("si"."scheduled_date" <= (CURRENT_DATE + '7 days'::interval)))
  ORDER BY "si"."scheduled_date", "c"."priority" DESC;


ALTER VIEW "public"."upcoming_schedule" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "store_name" "text",
    "owner_name" "text",
    "phone" "text",
    "segment" "text",
    "plan" "text",
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "trial_active" boolean DEFAULT false,
    "subscription_status" "text" DEFAULT 'trial'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'moderator'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."count_files"
    ADD CONSTRAINT "count_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counts"
    ADD CONSTRAINT "counts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."divergence_justifications"
    ADD CONSTRAINT "divergence_justifications_count_id_codigo_key" UNIQUE ("count_id", "codigo");



ALTER TABLE ONLY "public"."divergence_justifications"
    ADD CONSTRAINT "divergence_justifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manual_entries"
    ADD CONSTRAINT "manual_entries_count_codigo_uniq" UNIQUE ("count_id", "codigo");



ALTER TABLE ONLY "public"."manual_entries"
    ADD CONSTRAINT "manual_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_items"
    ADD CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_catalog"
    ADD CONSTRAINT "product_catalog_org_id_codigo_key" UNIQUE ("org_id", "codigo");



ALTER TABLE ONLY "public"."product_catalog"
    ADD CONSTRAINT "product_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_configs"
    ADD CONSTRAINT "schedule_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_history"
    ADD CONSTRAINT "schedule_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_admin_sessions_created_at" ON "public"."admin_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_sessions_target_user_id" ON "public"."admin_sessions" USING "btree" ("target_user_id");



CREATE INDEX "idx_admin_sessions_user_id" ON "public"."admin_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_categories_active" ON "public"."categories" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_categories_priority" ON "public"."categories" USING "btree" ("user_id", "priority" DESC);



CREATE INDEX "idx_categories_user_id" ON "public"."categories" USING "btree" ("user_id");



CREATE INDEX "idx_count_files_count_id" ON "public"."count_files" USING "btree" ("count_id");



CREATE INDEX "idx_counts_created" ON "public"."counts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_counts_store_id" ON "public"."counts" USING "btree" ("store_id");



CREATE INDEX "idx_counts_user" ON "public"."counts" USING "btree" ("user_id");



CREATE INDEX "idx_divergence_justifications_count_id" ON "public"."divergence_justifications" USING "btree" ("count_id");



CREATE INDEX "idx_manual_entries_count" ON "public"."manual_entries" USING "btree" ("count_id");



CREATE INDEX "idx_manual_entries_count_created" ON "public"."manual_entries" USING "btree" ("count_id", "created_at" DESC);



CREATE INDEX "idx_plan_items_count" ON "public"."plan_items" USING "btree" ("count_id");



CREATE INDEX "idx_plan_items_count_codigo" ON "public"."plan_items" USING "btree" ("count_id", "codigo");



CREATE INDEX "idx_product_catalog_org_codigo" ON "public"."product_catalog" USING "btree" ("org_id", "codigo" "text_pattern_ops");



CREATE INDEX "idx_reports_count_id" ON "public"."reports" USING "btree" ("count_id");



CREATE INDEX "idx_results_count" ON "public"."results" USING "btree" ("count_id");



CREATE INDEX "idx_schedule_configs_active" ON "public"."schedule_configs" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_schedule_configs_dates" ON "public"."schedule_configs" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_schedule_configs_user_id" ON "public"."schedule_configs" USING "btree" ("user_id");



CREATE INDEX "idx_schedule_history_item" ON "public"."schedule_history" USING "btree" ("schedule_item_id");



CREATE INDEX "idx_schedule_history_user" ON "public"."schedule_history" USING "btree" ("user_id");



CREATE INDEX "idx_schedule_items_category" ON "public"."schedule_items" USING "btree" ("category_id");



CREATE INDEX "idx_schedule_items_config" ON "public"."schedule_items" USING "btree" ("config_id");



CREATE INDEX "idx_schedule_items_count_id" ON "public"."schedule_items" USING "btree" ("count_id");



CREATE INDEX "idx_schedule_items_date" ON "public"."schedule_items" USING "btree" ("scheduled_date");



CREATE INDEX "idx_schedule_items_pending" ON "public"."schedule_items" USING "btree" ("scheduled_date") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_schedule_items_status" ON "public"."schedule_items" USING "btree" ("status");



CREATE INDEX "idx_schedule_items_week" ON "public"."schedule_items" USING "btree" ("config_id", "week_number");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schedule_configs_updated_at" BEFORE UPDATE ON "public"."schedule_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schedule_items_updated_at" BEFORE UPDATE ON "public"."schedule_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."count_files"
    ADD CONSTRAINT "count_files_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counts"
    ADD CONSTRAINT "counts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."divergence_justifications"
    ADD CONSTRAINT "divergence_justifications_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."divergence_justifications"
    ADD CONSTRAINT "divergence_justifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."manual_entries"
    ADD CONSTRAINT "manual_entries_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_items"
    ADD CONSTRAINT "plan_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_catalog"
    ADD CONSTRAINT "product_catalog_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_history"
    ADD CONSTRAINT "schedule_history_schedule_item_id_fkey" FOREIGN KEY ("schedule_item_id") REFERENCES "public"."schedule_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."schedule_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."counts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "admin manages invitations" ON "public"."organization_invitations" USING (("public"."is_org_admin"() AND ("org_id" = "public"."my_org_id"()))) WITH CHECK (("public"."is_org_admin"() AND ("org_id" = "public"."my_org_id"())));



CREATE POLICY "admin writes catalog" ON "public"."product_catalog" USING ((("org_id" = "public"."my_org_id"()) AND "public"."is_org_admin"())) WITH CHECK ((("org_id" = "public"."my_org_id"()) AND "public"."is_org_admin"()));



ALTER TABLE "public"."admin_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated reads invitation" ON "public"."organization_invitations" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories-own" ON "public"."categories" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."count_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "count_files-own" ON "public"."count_files" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "count_files"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "count_files"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."counts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counts-delete" ON "public"."counts" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "counts-insert" ON "public"."counts" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "counts-select" ON "public"."counts" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."role" = 'admin'::"text") AND ('view_admin_dashboard'::"text" = ANY ("ur"."permissions")))))));



CREATE POLICY "counts-update" ON "public"."counts" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."divergence_justifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "divergence_justifications-own" ON "public"."divergence_justifications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "divergence_justifications"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "divergence_justifications"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."manual_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manual_entries-own" ON "public"."manual_entries" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "manual_entries"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "manual_entries"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "member reads catalog" ON "public"."product_catalog" FOR SELECT USING (("org_id" = "public"."my_org_id"()));



ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plan_items-own" ON "public"."plan_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "plan_items"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "plan_items"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."product_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read own org" ON "public"."organizations" FOR SELECT USING (("id" = "public"."my_org_id"()));



CREATE POLICY "read own org members" ON "public"."organization_members" FOR SELECT USING (("org_id" = "public"."my_org_id"()));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports-own" ON "public"."reports" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "reports"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "reports"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "results-own" ON "public"."results" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "results"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."counts" "c"
  WHERE (("c"."id" = "results"."count_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."schedule_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_configs-own" ON "public"."schedule_configs" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."schedule_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_history-own" ON "public"."schedule_history" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."schedule_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_items-own" ON "public"."schedule_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."schedule_configs" "sc"
  WHERE (("sc"."id" = "schedule_items"."config_id") AND ("sc"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."schedule_configs" "sc"
  WHERE (("sc"."id" = "schedule_items"."config_id") AND ("sc"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stores-own" ON "public"."stores" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles-delete" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "user_profiles-insert" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "user_profiles-select" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."role" = 'admin'::"text") AND ('view_admin_dashboard'::"text" = ANY ("ur"."permissions")))))));



CREATE POLICY "user_profiles-update" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles-own-read" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_invitation"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_manual_entry"("p_count_id" "uuid", "p_codigo" "text", "p_qty" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_manual_entry"("p_count_id" "uuid", "p_codigo" "text", "p_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_manual_entry"("p_count_id" "uuid", "p_codigo" "text", "p_qty" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_users_with_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_users_with_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users_with_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bulk_upsert_catalog"("p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bulk_upsert_catalog"("p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_upsert_catalog"("p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."compute_count_results"("p_count_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."compute_count_results"("p_count_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_count_results"("p_count_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_organization"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_organization"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_available_date"("p_start_date" "date", "p_week_offset" integer, "p_day_of_week" integer, "p_work_days" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_available_date"("p_start_date" "date", "p_week_offset" integer, "p_day_of_week" integer, "p_work_days" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_available_date"("p_start_date" "date", "p_week_offset" integer, "p_day_of_week" integer, "p_work_days" integer[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_org_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_org_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_configs" TO "anon";
GRANT ALL ON TABLE "public"."schedule_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_configs" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items" TO "service_role";



GRANT ALL ON TABLE "public"."category_stats" TO "service_role";
GRANT SELECT ON TABLE "public"."category_stats" TO "authenticated";



GRANT ALL ON TABLE "public"."count_files" TO "anon";
GRANT ALL ON TABLE "public"."count_files" TO "authenticated";
GRANT ALL ON TABLE "public"."count_files" TO "service_role";



GRANT ALL ON TABLE "public"."counts" TO "anon";
GRANT ALL ON TABLE "public"."counts" TO "authenticated";
GRANT ALL ON TABLE "public"."counts" TO "service_role";



GRANT ALL ON TABLE "public"."divergence_justifications" TO "anon";
GRANT ALL ON TABLE "public"."divergence_justifications" TO "authenticated";
GRANT ALL ON TABLE "public"."divergence_justifications" TO "service_role";



GRANT ALL ON TABLE "public"."manual_entries" TO "anon";
GRANT ALL ON TABLE "public"."manual_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."manual_entries" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."plan_items" TO "anon";
GRANT ALL ON TABLE "public"."plan_items" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_items" TO "service_role";



GRANT ALL ON TABLE "public"."product_catalog" TO "anon";
GRANT ALL ON TABLE "public"."product_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."product_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."results" TO "anon";
GRANT ALL ON TABLE "public"."results" TO "authenticated";
GRANT ALL ON TABLE "public"."results" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_history" TO "anon";
GRANT ALL ON TABLE "public"."schedule_history" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_history" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."upcoming_schedule" TO "service_role";
GRANT SELECT ON TABLE "public"."upcoming_schedule" TO "authenticated";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







-- Objetos fora do schema public (não incluídos no dump padrão)

CREATE OR REPLACE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

CREATE OR REPLACE TRIGGER "on_auth_user_created_role"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_role"();

INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('contagens', 'contagens', false)
ON CONFLICT ("id") DO NOTHING;

DROP POLICY IF EXISTS "Permitir upload para todos 1s8edci_0" ON "storage"."objects";
CREATE POLICY "Permitir upload para todos 1s8edci_0" ON "storage"."objects"
  FOR INSERT TO "public"
  WITH CHECK (("bucket_id" = 'contagens'::"text"));

-- Views: em produção só "authenticated" tem SELECT; remove os privilégios
-- padrão concedidos automaticamente na criação.
REVOKE ALL ON TABLE "public"."category_stats" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."upcoming_schedule" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."category_stats" TO "authenticated";
GRANT SELECT ON TABLE "public"."upcoming_schedule" TO "authenticated";
