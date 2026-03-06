-- 添加列宽和行高字段到 excel_data_raw 表
-- 执行此脚本以支持文档格式优化功能

-- 添加 column_widths 列（存储每列的宽度）
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS column_widths INTEGER[];

-- 添加 row_heights 列（存储每行的高度）
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS row_heights INTEGER[];

-- 为现有记录设置默认值
UPDATE excel_data_raw 
SET column_widths = ARRAY_FILL(150, ARRAY[ARRAY_LENGTH(headers, 1)])
WHERE column_widths IS NULL AND headers IS NOT NULL;

UPDATE excel_data_raw 
SET row_heights = ARRAY_FILL(40, ARRAY[JSONB_ARRAY_LENGTH(rows::jsonb)])
WHERE row_heights IS NULL AND rows IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN excel_data_raw.column_widths IS '每列的宽度（像素），用于前端显示';
COMMENT ON COLUMN excel_data_raw.row_heights IS '每行的高度（像素），用于前端显示';
