-- 验证 profiles 表的 RLS 策略状态

-- 1. 检查 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 2. 检查所有策略
SELECT policyname, cmd, permissive, roles
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. 检查表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
