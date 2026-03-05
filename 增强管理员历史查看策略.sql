-- =====================================================
-- 增强 RLS 策略：管理员可查看所有修改历史
-- =====================================================

-- 1. 删除旧的 edit_history SELECT 策略
DROP POLICY IF EXISTS "Users can view edit history for shared files" ON edit_history;

-- 2. 创建新的 SELECT 策略：管理员可查看所有历史，普通用户只能查看共享文件或自己的历史
CREATE POLICY "Users can view edit history" 
  ON edit_history FOR SELECT 
  USING (
    -- 管理员可以查看所有历史
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    -- 或者用户可以查看自己的修改历史
    OR user_id = auth.uid()
    -- 或者用户可以查看共享文件的修改历史
    OR EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = edit_history.file_id 
      AND excel_files.is_shared = TRUE
    )
  );

-- 3. 确保 edit_history 表有正确的索引
CREATE INDEX IF NOT EXISTS idx_edit_history_action ON edit_history(action);

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE 'RLS 策略更新完成！';
  RAISE NOTICE '管理员现在可以查看所有文件的修改历史';
END $$;
