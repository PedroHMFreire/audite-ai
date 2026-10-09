-- Fix #3: corrigir função de métricas (auth.users usa coluna id)
create or replace function public.update_conversion_metrics_cache(
  start_date date,
  end_date date
) returns void as $$
declare
  metrics_data record;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas administradores podem atualizar métricas';
  end if;

  with trials as (
    select user_id, timestamp::date as date
    from public.conversion_events
    where event_type = 'trial_signup_complete'
      and timestamp::date between start_date and end_date
  ),
  conversions as (
    select user_id, timestamp::date as date
    from public.conversion_events
    where event_type = 'subscription_active'
      and timestamp::date between start_date and end_date
  ),
  churns as (
    select user_id, timestamp::date as date
    from public.conversion_events
    where event_type = 'churn'
      and timestamp::date between start_date and end_date
  )
  select
    (select count(distinct id) from auth.users where created_at::date between start_date and end_date) as total_users,
    (select count(*) from trials) as total_trials,
    (select count(*) from conversions) as total_conversions,
    case
      when (select count(*) from trials) > 0
      then ((select count(*) from conversions)::numeric / (select count(*) from trials)::numeric) * 100
      else 0
    end as conversion_rate,
    (select count(*) from conversions) * 97 as revenue,
    case
      when (select count(*) from conversions) > 0
      then ((select count(*) from churns)::numeric / (select count(*) from conversions)::numeric) * 100
      else 0
    end as churn_rate,
    14.5 as average_time_to_convert
  into metrics_data;

  insert into public.conversion_metrics_cache (
    period_start,
    period_end,
    total_users,
    total_trials,
    total_conversions,
    conversion_rate,
    revenue,
    churn_rate,
    average_time_to_convert
  ) values (
    start_date,
    end_date,
    metrics_data.total_users,
    metrics_data.total_trials,
    metrics_data.total_conversions,
    metrics_data.conversion_rate,
    metrics_data.revenue,
    metrics_data.churn_rate,
    metrics_data.average_time_to_convert
  )
  on conflict (period_start, period_end) do update set
    total_users = excluded.total_users,
    total_trials = excluded.total_trials,
    total_conversions = excluded.total_conversions,
    conversion_rate = excluded.conversion_rate,
    revenue = excluded.revenue,
    churn_rate = excluded.churn_rate,
    average_time_to_convert = excluded.average_time_to_convert,
    calculated_at = now();

  if to_regprocedure('public.log_admin_action(text,uuid,jsonb)') is not null then
    perform public.log_admin_action(
      'update_conversion_metrics',
      null,
      jsonb_build_object('period_start', start_date, 'period_end', end_date)
    );
  end if;
end;
$$ language plpgsql security definer;
