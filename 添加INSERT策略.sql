-- 添加 profiles 表的 INSERT 策略

-- 添加 INSERT 策略
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 验证添加成功
SELECT policyname, cmd, permissive, roles
FROM pg_policies 
WHERE tablename = 'profiles';
