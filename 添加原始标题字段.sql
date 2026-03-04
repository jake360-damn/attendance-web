-- =====================================================
-- 添加原始标题字段迁移脚本
-- =====================================================

-- 为 excel_files 表添加 original_headers 字段
ALTER TABLE excel_files 
ADD COLUMN IF NOT EXISTS original_headers TEXT[];

-- 添加注释
COMMENT ON COLUMN excel_files.original_headers IS '上传文件时的原始列标题';

-- 验证字段已添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'excel_files' 
AND column_name = 'original_headers';
