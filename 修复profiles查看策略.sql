-- =====================================================
-- 修复 profiles 表的 SELECT 策略
-- 允许所有认证用户查看所有用户资料
-- 这样修改历史记录中可以显示修改者的用户名
-- =====================================================

-- 1. 删除旧的 SELECT 策略（只允许查看自己的）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- 2. 创建新的 SELECT 策略：所有认证用户可以查看所有用户资料
CREATE POLICY "Users can view all profiles" 
  ON profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- 3. 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE 'profiles 表 SELECT 策略已更新！';
  RAISE NOTICE '现在所有认证用户都可以查看其他用户的用户名和角色';
END $$;
