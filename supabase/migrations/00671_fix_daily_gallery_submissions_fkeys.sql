ALTER TABLE daily_gallery_submissions
DROP CONSTRAINT IF EXISTS daily_gallery_submissions_user_id_fkey,
DROP CONSTRAINT IF EXISTS daily_gallery_submissions_reviewed_by_fkey;

ALTER TABLE daily_gallery_submissions
ADD CONSTRAINT daily_gallery_submissions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE SET NULL;

ALTER TABLE daily_gallery_submissions
ADD CONSTRAINT daily_gallery_submissions_reviewed_by_fkey
FOREIGN KEY (reviewed_by) REFERENCES profiles(id)
ON DELETE SET NULL;