// 简单的数据库连接测试脚本
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://backend.appmiaoda.com/projects/supabase290419908913709056';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDg4NjY4NzAyLCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.xja8gDf98-qT9jN9cUtoaKun0bKYvuq1faaGQrYohVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 测试数据库连接...\n');
  
  try {
    // 测试 1: 配置表
    console.log('1️⃣ 测试 storage_configs 表...');
    const { data: config, error: configError } = await supabase
      .from('storage_configs')
      .select('*')
      .limit(1);
    
    if (configError) {
      console.error('❌ 配置表查询失败:', configError.message);
    } else {
      console.log('✅ 配置表正常，记录数:', config?.length || 0);
      if (config && config[0]) {
        console.log('   站点标题:', config[0].site_title);
      }
    }
    
    // 测试 2: 媒体内容表
    console.log('\n2️⃣ 测试 media_items 表...');
    const { data: media, error: mediaError } = await supabase
      .from('media_items')
      .select('*')
      .eq('status', 'approved')
      .limit(5);
    
    if (mediaError) {
      console.error('❌ 媒体表查询失败:', mediaError.message);
    } else {
      console.log('✅ 媒体表正常，已发布内容数:', media?.length || 0);
    }
    
    // 测试 3: 用户表
    console.log('\n3️⃣ 测试 profiles 表...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ 用户表查询失败:', profilesError.message);
    } else {
      console.log('✅ 用户表正常，用户数:', profiles?.length || 0);
    }
    
    console.log('\n✅ 所有测试完成！');
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

testConnection();
