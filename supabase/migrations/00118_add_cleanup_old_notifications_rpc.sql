create or replace function cleanup_old_notifications(days_threshold integer)
returns void as $$
begin
  delete from notifications
  where created_at < (now() - (days_threshold || ' days')::interval);
end;
$$ language plpgsql security definer;
