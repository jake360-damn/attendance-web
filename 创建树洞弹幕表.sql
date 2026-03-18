-- =====================================================
-- 树洞弹幕表迁移脚本
-- =====================================================

-- 创建弹幕表
CREATE TABLE IF NOT EXISTS treehole_danmakus (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 为 treehole_danmakus 表启用 RLS
ALTER TABLE treehole_danmakus ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略 - 所有人可查看
CREATE POLICY "Anyone can view danmakus" 
  ON treehole_danmakus FOR SELECT 
  USING (TRUE);

-- 创建 RLS 策略 - 只有登录用户可发布
CREATE POLICY "Authenticated users can insert danmakus" 
  ON treehole_danmakus FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 创建 RLS 策略 - 只有本人可删除自己的弹幕
CREATE POLICY "Users can delete own danmakus" 
  ON treehole_danmakus FOR DELETE 
  USING (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_treehole_danmakus_created_at ON treehole_danmakus(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treehole_danmakus_user_id ON treehole_danmakus(user_id);

-- 验证表已创建
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'treehole_danmakus'
ORDER BY ordinal_position;
