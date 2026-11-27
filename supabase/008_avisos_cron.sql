-- Rivendel · lanzar la función "avisos" cada mañana (08:00 UTC = 9:00 en invierno, 10:00 en verano)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'rivendel-avisos';
select cron.schedule(
  'rivendel-avisos',
  '0 8 * * *',
  $$ select net.http_post(
       url := 'https://nzrgwctgdbmltkkwycow.supabase.co/functions/v1/avisos',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);

select jobname, schedule, active, (select count(*) from app_secrets where key = 'vapid') as claves from cron.job where jobname = 'rivendel-avisos';
