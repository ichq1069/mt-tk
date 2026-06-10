const fs = require('fs');
const path = require('path');

const migrationsDir = '/workspace/app-b53zny1ll3wh/supabase/migrations';
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

const dropLogic = \`-- 清理可能导致冲突的旧版函数
DO \$\$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc 
              INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE proname = 'upsert_user_visit_stats' AND pg_namespace.nspname = 'public') 
    LOOP
        EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.argtypes || ')';
    END LOOP;
END \$\$;\`;

files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('upsert_user_visit_stats')) {
    // 寻找所有的 DROP FUNCTION upsert_user_visit_stats 并替换
    const regex = /DROP FUNCTION IF EXISTS (public\\.)?upsert_user_visit_stats\\s*\\([^)]*\\);/gi;
    if (regex.test(content)) {
      content = content.replace(regex, dropLogic);
      fs.writeFileSync(filePath, content);
      console.log(\`Updated \${file}\`);
    } else if (content.includes('CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats') || content.includes('CREATE OR REPLACE FUNCTION upsert_user_visit_stats')) {
        // 如果没有 DROP 语句但在创建，则在创建之前插入
        const createRegex = /CREATE OR REPLACE FUNCTION (public\\.)?upsert_user_visit_stats/i;
        content = content.replace(createRegex, (match) => dropLogic + '\\n\\n' + match);
        fs.writeFileSync(filePath, content);
        console.log(\`Updated \${file} (inserted drop logic)\`);
    }
  }
});
