-- Force PostgREST schema reload by adding a dummy table and dropping it
CREATE TABLE IF NOT EXISTS public.pgrst_reload_dummy (id int);
DROP TABLE public.pgrst_reload_dummy;
