-- 彻底修复 profiles 表的 RLS 策略问题

-- 1. 先禁用 RLS，确保我们可以操作
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略（避免冲突）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON profiles;

-- 3. 确保表结构正确
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- 4. 重新启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. 创建宽松但安全的策略
-- 允许认证用户查看自己的资料
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- 允许认证用户插入自己的资料（关键修复）
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 允许认证用户更新自己的资料
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 允许认证用户删除自己的资料
CREATE POLICY "Users can delete own profile" 
  ON profiles FOR DELETE 
  USING (auth.uid() = id);

-- 6. 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';
