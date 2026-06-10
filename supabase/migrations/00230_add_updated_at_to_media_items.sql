alter table media_items add column if not exists updated_at timestamptz default now();

-- 自动更新触发器
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_media_items_updated_at
    before update on media_items
    for each row
    execute procedure update_updated_at_column();
