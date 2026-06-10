import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../_shared/cors.ts";

const ARCHIVE_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - ARCHIVE_DAYS);
    const thresholdDateStr = archiveThreshold.toISOString().split("T")[0];

    console.log(`[Archive] Starting archiving for records before ${thresholdDateStr}`);

    const results: any = {};

    // 1. Archive ad_unlock_logs
    const { data: unlockToArchive, error: unlockSelectError } = await supabaseClient
      .from("ad_unlock_logs")
      .select("*")
      .lt("created_at", archiveThreshold.toISOString());
    
    if (unlockToArchive && unlockToArchive.length > 0) {
      const { error: unlockInsertError } = await supabaseClient
        .from("ad_unlock_logs_archive")
        .insert(unlockToArchive);
      
      if (!unlockInsertError) {
        const ids = unlockToArchive.map(log => log.id);
        const { error: unlockDeleteError } = await supabaseClient
          .from("ad_unlock_logs")
          .delete()
          .in("id", ids);
        results.ad_unlock_logs = { moved: ids.length, success: !unlockDeleteError };
      }
    }

    // 2. Archive daily_gallery_access_logs
    const { data: accessToArchive, error: accessSelectError } = await supabaseClient
      .from("daily_gallery_access_logs")
      .select("*")
      .lt("accessed_at", archiveThreshold.toISOString());
    
    if (accessToArchive && accessToArchive.length > 0) {
      const { error: accessInsertError } = await supabaseClient
        .from("daily_gallery_access_logs_archive")
        .insert(accessToArchive);
      
      if (!accessInsertError) {
        const ids = accessToArchive.map(log => log.id);
        const { error: accessDeleteError } = await supabaseClient
          .from("daily_gallery_access_logs")
          .delete()
          .in("id", ids);
        results.daily_gallery_access_logs = { moved: ids.length, success: !accessDeleteError };
      }
    }

    // 3. Archive daily_gallery_posts (Optional but recommended for high data volume)
    const { data: postsToArchive, error: postsSelectError } = await supabaseClient
      .from("daily_gallery_posts")
      .select("*")
      .lt("post_date", thresholdDateStr);
    
    if (postsToArchive && postsToArchive.length > 0) {
      const { error: postsInsertError } = await supabaseClient
        .from("daily_gallery_posts_archive")
        .insert(postsToArchive);
      
      if (!postsInsertError) {
        const ids = postsToArchive.map(post => post.id);
        const { error: postsDeleteError } = await supabaseClient
          .from("daily_gallery_posts")
          .delete()
          .in("id", ids);
        results.daily_gallery_posts = { moved: ids.length, success: !postsDeleteError };
      }
    }

    // 记录归档日志 (可选，记录在 scheduled_task_logs)
    await supabaseClient.from("scheduled_task_logs").insert({
      task_name: "daily_gallery_archiving",
      execution_time: new Date().toISOString(),
      success: true,
      details: results
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Archiving completed for records before ${thresholdDateStr}`,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Archive] Error:", error.message);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
