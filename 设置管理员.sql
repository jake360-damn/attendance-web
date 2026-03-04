-- =====================================================
-- 设置管理员账号脚本
-- =====================================================
-- 使用方法：
-- 1. 将下面的 'user_email@example.com' 替换为实际的邮箱地址
-- 2. 在 Supabase SQL Editor 中执行此脚本
-- =====================================================

-- 方法1：通过邮箱设置管理员（推荐）
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'user_email@example.com';

-- 方法2：如果知道用户ID，可以直接设置
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE id = 'user-uuid-here';

-- 方法3：创建新的管理员用户（需要先在 Auth 中注册）
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES (
--   'user-uuid-from-auth',
--   'admin@example.com',
--   '管理员名称',
--   'admin'
-- );

-- 查看所有管理员
SELECT id, email, full_name, role, created_at 
FROM profiles 
WHERE role = 'admin';

-- 查看所有用户及其角色
SELECT id, email, full_name, role, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 取消管理员权限
-- UPDATE profiles 
-- SET role = 'user' 
-- WHERE email = 'admin@example.com';
