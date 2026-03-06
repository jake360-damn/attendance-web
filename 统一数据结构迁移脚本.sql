-- 添加 all_data 列
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS all_data JSONB DEFAULT NULL;

-- 将现有数据迁移到 all_data 格式
UPDATE excel_data_raw 
SET all_data = jsonb_build_array(
  headers,
  CASE 
    WHEN rows IS NOT NULL THEN rows::jsonb
    ELSE '[]'::jsonb
  END
)
WHERE all_data IS NULL AND headers IS NOT NULL;

-- 删除旧列（可选，建议在确认数据迁移成功后执行）
-- ALTER TABLE excel_data_raw DROP COLUMN IF EXISTS headers;
-- ALTER TABLE excel_data_raw DROP COLUMN IF EXISTS rows;
-- ALTER TABLE excel_data_raw DROP COLUMN IF EXISTS header_merges;
