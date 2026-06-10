-- 1. Helper functions already exist from previous step, but ensure they are up to date and set correctly.
-- is_admin(uid) is already defined.

-- 2. Media Items Table Optimization
-- Consolidate SELECT policies
DROP POLICY IF EXISTS "Anyone can view approved media" ON public.media_items;
DROP POLICY IF EXISTS "Users can view their own media" ON public.media_items;
DROP POLICY IF EXISTS "Allow public select on media_items through join" ON public.media_items;
DROP POLICY IF EXISTS "Public View Approved" ON public.media_items;
DROP POLICY IF EXISTS "Users View Own" ON public.media_items;
DROP POLICY IF EXISTS "media_items_select_optimized" ON public.media_items;

CREATE POLICY "media_items_select_optimized" ON public.media_items
FOR SELECT TO public
USING (
  (deleted_at IS NULL) AND (
    (status::text = 'approved'::text) OR 
    (user_id = auth.uid()) OR 
    is_admin(auth.uid())
  )
);

-- Refine INSERT/UPDATE/DELETE for media_items
DROP POLICY IF EXISTS "Users can update their own media" ON public.media_items;
CREATE POLICY "media_items_update_own" ON public.media_items
FOR UPDATE TO authenticated
USING (can_manage_media(id, auth.uid()))
WITH CHECK (can_manage_media(id, auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to media" ON public.media_items;
CREATE POLICY "media_items_admin_all" ON public.media_items
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- 3. Comments Table Optimization
DROP POLICY IF EXISTS "Allow anyone to read comments" ON public.comments;
CREATE POLICY "comments_select_public" ON public.comments
FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON public.comments;
CREATE POLICY "comments_insert_authenticated" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow owners to delete their own comments" ON public.comments;
CREATE POLICY "comments_delete_own" ON public.comments
FOR DELETE TO authenticated
USING (can_manage_comment(id, auth.uid()));

DROP POLICY IF EXISTS "Allow owners to update their own comments" ON public.comments;
CREATE POLICY "comments_update_own" ON public.comments
FOR UPDATE TO authenticated
USING (can_manage_comment(id, auth.uid()))
WITH CHECK (can_manage_comment(id, auth.uid()));

-- 4. Photo Albums Table Optimization
DROP POLICY IF EXISTS "Admin can manage albums" ON public.photo_albums;
DROP POLICY IF EXISTS "photo_albums_admin_all" ON public.photo_albums;
DROP POLICY IF EXISTS "admin_all_photo_albums" ON public.photo_albums;
CREATE POLICY "photo_albums_admin_all" ON public.photo_albums
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_select_photo_albums" ON public.photo_albums;
CREATE POLICY "photo_albums_select_public" ON public.photo_albums
FOR SELECT TO public
USING (can_browse_album(id, auth.uid()));

-- 5. Configs Optimization
DROP POLICY IF EXISTS "public_read_system_configs" ON public.system_configs;
DROP POLICY IF EXISTS "admin_all_system_configs" ON public.system_configs;
DROP POLICY IF EXISTS "Allow anon read on system_configs" ON public.system_configs;
DROP POLICY IF EXISTS "Authenticated users can read system_configs" ON public.system_configs;
DROP POLICY IF EXISTS "Allow public read on system_configs" ON public.system_configs;
DROP POLICY IF EXISTS "Admins can manage configs" ON public.system_configs;
DROP POLICY IF EXISTS "Admins manage system_configs" ON public.system_configs;

CREATE POLICY "system_configs_select_public" ON public.system_configs
FOR SELECT TO public
USING (true);

CREATE POLICY "system_configs_admin_all" ON public.system_configs
FOR ALL TO authenticated
USING (can_admin_configs(auth.uid()));

DROP POLICY IF EXISTS "public_read_storage_configs" ON public.storage_configs;
DROP POLICY IF EXISTS "admin_all_storage_configs" ON public.storage_configs;
DROP POLICY IF EXISTS "Allow anon read on storage_configs" ON public.storage_configs;
DROP POLICY IF EXISTS "Allow public read on storage_configs" ON public.storage_configs;
DROP POLICY IF EXISTS "Admins manage storage_configs" ON public.storage_configs;

CREATE POLICY "storage_configs_select_public" ON public.storage_configs
FOR SELECT TO public
USING (true);

CREATE POLICY "storage_configs_admin_all" ON public.storage_configs
FOR ALL TO authenticated
USING (can_admin_configs(auth.uid()));

-- 6. Content Categories and Tags
DROP POLICY IF EXISTS "Allow public read content_categories" ON public.content_categories;
DROP POLICY IF EXISTS "Allow admin all content_categories" ON public.content_categories;
CREATE POLICY "content_categories_select_public" ON public.content_categories
FOR SELECT TO public
USING (true);
CREATE POLICY "content_categories_admin_all" ON public.content_categories
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "tags_select_public" ON public.tags
FOR SELECT TO public
USING (true);
CREATE POLICY "tags_admin_all" ON public.tags
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- 7. Favorites Optimization
DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "favorites_select_optimized" ON public.favorites;

CREATE POLICY "favorites_select_own" ON public.favorites
FOR SELECT TO public
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "favorites_insert_own" ON public.favorites
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "favorites_delete_own" ON public.favorites
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 8. User Visit Stats Optimization
DROP POLICY IF EXISTS "visit_stats_insert_public" ON public.user_visit_stats;
DROP POLICY IF EXISTS "visit_stats_admin_all" ON public.user_visit_stats;
DROP POLICY IF EXISTS "Anyone can insert visit stats" ON public.user_visit_stats;
DROP POLICY IF EXISTS "Admins can view visit stats" ON public.user_visit_stats;
DROP POLICY IF EXISTS "Anon can insert visit stats" ON public.user_visit_stats;
DROP POLICY IF EXISTS "Admin can view visit stats" ON public.user_visit_stats;
DROP POLICY IF EXISTS "Anyone can select visit stats" ON public.user_visit_stats;

CREATE POLICY "visit_stats_insert_public" ON public.user_visit_stats
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "visit_stats_admin_all" ON public.user_visit_stats
FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- 9. User Badges Optimization
DROP POLICY IF EXISTS "user_badges_select_own" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_admin_all" ON public.user_badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Admins have full access to user_badges" ON public.user_badges;

CREATE POLICY "user_badges_select_own" ON public.user_badges
FOR SELECT TO public
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "user_badges_admin_all" ON public.user_badges
FOR ALL TO authenticated
USING (is_admin(auth.uid()));
