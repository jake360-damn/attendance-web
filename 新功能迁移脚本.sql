-- =====================================================
-- 新功能迁移脚本：管理员共享文件 + 修改历史记录
-- =====================================================

-- 1. 为 excel_files 表添加共享相关字段
ALTER TABLE excel_files 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES profiles(id);

-- 2. 创建修改历史记录表
CREATE TABLE IF NOT EXISTS edit_history (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  file_id UUID REFERENCES excel_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  row_index INTEGER,
  col_index INTEGER,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT, -- 描述性文字
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. 为 edit_history 表启用 RLS
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;

-- 4. 创建 edit_history 的 RLS 策略
-- 所有人可以查看共享文件的修改历史
CREATE POLICY "Users can view edit history for shared files" 
  ON edit_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = edit_history.file_id 
      AND excel_files.is_shared = TRUE
    )
    OR user_id = auth.uid()
  );

-- 用户可以插入自己的修改记录
CREATE POLICY "Users can insert own edit history" 
  ON edit_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 5. 更新 excel_files 的 RLS 策略，允许查看共享文件
-- 先删除旧的策略
DROP POLICY IF EXISTS "Users can view own excel files" ON excel_files;

-- 创建新的策略：用户可以查看自己的文件或共享的文件
CREATE POLICY "Users can view own or shared excel files" 
  ON excel_files FOR SELECT 
  USING (auth.uid() = user_id OR is_shared = TRUE);

-- 6. 更新 attendance_records 的 RLS 策略，允许查看共享文件的记录
-- 先删除旧的策略
DROP POLICY IF EXISTS "Users can view own attendance records" ON attendance_records;

-- 创建新的策略：用户可以查看自己的记录或共享文件的记录
CREATE POLICY "Users can view own or shared attendance records" 
  ON attendance_records FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = attendance_records.file_id 
      AND excel_files.is_shared = TRUE
    )
  );

-- 用户可以更新共享文件的记录
DROP POLICY IF EXISTS "Users can update own attendance records" ON attendance_records;
CREATE POLICY "Users can update own or shared attendance records" 
  ON attendance_records FOR UPDATE 
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = attendance_records.file_id 
      AND excel_files.is_shared = TRUE
    )
  );

-- 用户可以向共享文件插入记录
DROP POLICY IF EXISTS "Users can insert own attendance records" ON attendance_records;
CREATE POLICY "Users can insert attendance records" 
  ON attendance_records FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 7. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_edit_history_file_id ON edit_history(file_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_user_id ON edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_created_at ON edit_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excel_files_is_shared ON excel_files(is_shared);
CREATE INDEX IF NOT EXISTS idx_attendance_records_file_id ON attendance_records(file_id);

-- 8. 创建视图：获取修改历史及用户信息
CREATE OR REPLACE VIEW edit_history_with_user AS
SELECT 
  eh.id,
  eh.file_id,
  eh.user_id,
  eh.record_id,
  eh.action,
  eh.row_index,
  eh.col_index,
  eh.field_name,
  eh.old_value,
  eh.new_value,
  eh.description,
  eh.created_at,
  ef.file_name,
  p.full_name AS user_name,
  p.email AS user_email
FROM edit_history eh
LEFT JOIN profiles p ON eh.user_id = p.id
LEFT JOIN excel_files ef ON eh.file_id = ef.id;

-- 9. 创建视图：获取共享文件列表及上传者信息
CREATE OR REPLACE VIEW shared_files_with_uploader AS
SELECT 
  ef.id,
  ef.file_name,
  ef.file_size,
  ef.row_count,
  ef.created_at,
  ef.updated_at,
  ef.is_shared,
  ef.shared_by,
  uploader.full_name AS uploader_name,
  uploader.email AS uploader_email,
  sharer.full_name AS shared_by_name
FROM excel_files ef
LEFT JOIN profiles uploader ON ef.user_id = uploader.id
LEFT JOIN profiles sharer ON ef.shared_by = sharer.id
WHERE ef.is_shared = TRUE;

-- 10. 管理员相关策略
-- 管理员可以更新任何文件为共享状态
CREATE POLICY "Admins can update any excel file" 
  ON excel_files FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 管理员可以删除任何文件
CREATE POLICY "Admins can delete any excel file" 
  ON excel_files FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '迁移完成！已添加：';
  RAISE NOTICE '1. excel_files 表新增 is_shared 和 shared_by 字段';
  RAISE NOTICE '2. edit_history 表用于记录修改历史';
  RAISE NOTICE '3. 更新了 RLS 策略支持共享文件';
  RAISE NOTICE '4. 创建了 edit_history_with_user 视图';
  RAISE NOTICE '5. 创建了 shared_files_with_uploader 视图';
END $$;
