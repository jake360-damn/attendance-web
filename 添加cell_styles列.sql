-- =====================================================
-- 添加 cell_styles 列到 excel_data_raw 表
-- =====================================================

-- 添加 cell_styles 列（如果不存在）
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS cell_styles JSONB DEFAULT NULL;

-- 添加 column_widths 列（如果不存在）
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS column_widths INTEGER[] DEFAULT NULL;

-- 添加 row_heights 列（如果不存在）
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS row_heights INTEGER[] DEFAULT NULL;

-- 添加 merges 列（如果不存在）
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS merges JSONB DEFAULT NULL;

-- 添加 all_data 列（如果不存在）
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS all_data JSONB DEFAULT NULL;

-- 验证列已添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'excel_data_raw'
ORDER BY ordinal_position;
