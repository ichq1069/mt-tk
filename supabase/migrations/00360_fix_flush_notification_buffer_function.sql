-- 修复 flush_notification_buffer 函数，移除 metadata 字段
CREATE OR REPLACE FUNCTION public.flush_notification_buffer()
RETURNS VOID AS $$
DECLARE
    buf_rec RECORD;
BEGIN
    FOR buf_rec IN 
        SELECT * FROM public.notification_buffer 
        WHERE status::public.item_status = 'pending'::public.item_status AND send_at <= NOW()
    LOOP
        -- Insert into main notifications table (不包含 metadata 字段)
        INSERT INTO public.notifications (user_id, type, title, content, link, link_type)
        VALUES (buf_rec.user_id, buf_rec.type, buf_rec.title, buf_rec.content, buf_rec.link, buf_rec.link_type);

        -- Mark as sent
        UPDATE public.notification_buffer 
        SET status = 'sent', updated_at = NOW() 
        WHERE id = buf_rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;