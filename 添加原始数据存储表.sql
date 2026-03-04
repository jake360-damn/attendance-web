-- =====================================================
-- 添加原始数据存储表迁移脚本
-- =====================================================

-- 创建原始数据存储表
CREATE TABLE IF NOT EXISTS excel_data_raw (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  file_id UUID REFERENCES excel_files(id) ON DELETE CASCADE,
  headers TEXT[] NOT NULL,
  rows JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 为 excel_data_raw 表启用 RLS
ALTER TABLE excel_data_raw ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view raw data for shared files" 
  ON excel_data_raw FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = excel_data_raw.file_id 
      AND excel_files.is_shared = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = excel_data_raw.file_id 
      AND excel_files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own raw data" 
  ON excel_data_raw FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = excel_data_raw.file_id 
      AND excel_files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update raw data for shared files" 
  ON excel_data_raw FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = excel_data_raw.file_id 
      AND excel_files.is_shared = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = excel_data_raw.file_id 
      AND excel_files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own raw data" 
  ON excel_data_raw FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM excel_files 
      WHERE excel_files.id = excel_data_raw.file_id 
      AND excel_files.user_id = auth.uid()
    )
  );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_excel_data_raw_file_id ON excel_data_raw(file_id);

-- 验证表已创建
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'excel_data_raw';
