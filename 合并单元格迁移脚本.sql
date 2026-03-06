-- 合并单元格功能迁移脚本
-- 执行此脚本以支持合并单元格功能

-- 添加 merges 字段到 excel_data_raw 表
ALTER TABLE excel_data_raw 
ADD COLUMN IF NOT EXISTS merges JSONB DEFAULT NULL;

-- 添加注释说明字段用途
COMMENT ON COLUMN excel_data_raw.merges IS '合并单元格信息，存储格式: [{s: {r: 起始行, c: 起始列}, e: {r: 结束行, c: 结束列}}]';

-- 验证字段已添加
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'excel_data_raw' AND column_name = 'merges';
