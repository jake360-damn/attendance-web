-- 冻结行功能迁移脚本
-- 执行此脚本以支持行冻结功能

-- 添加 frozen_rows 字段到 excel_data_raw 表
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS frozen_rows INTEGER DEFAULT 0;

-- 添加注释说明字段用途
COMMENT ON COLUMN excel_data_raw.frozen_rows IS '冻结行数，指定前N行在滚动时保持固定显示';

-- 验证字段已添加
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'excel_data_raw' AND column_name = 'frozen_rows';
