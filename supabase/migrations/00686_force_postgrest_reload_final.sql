-- Force PostgREST to reload schema cache
CREATE TABLE IF NOT EXISTS tmp_postgrest_reload (id int);
DROP TABLE tmp_postgrest_reload;
