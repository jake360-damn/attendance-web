-- 修复外键约束问题：添加 profiles 表的 INSERT 策略

-- 如果策略已存在则删除
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 创建 INSERT 策略，允许用户插入自己的资料
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 验证策略是否创建成功
SELECT * FROM pg_policies WHERE tablename = 'profiles';
