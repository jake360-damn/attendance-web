-- 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (id)
);

-- 创建 excel_files 表（必须先创建，因为 attendance_records 引用它）
CREATE TABLE IF NOT EXISTS excel_files (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  row_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建 attendance_records 表
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_id UUID REFERENCES excel_files(id) ON DELETE CASCADE,
  employee_name TEXT,
  date DATE,
  check_in TIME,
  check_out TIME,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 启用 RLS (行级安全)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_files ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view own attendance records" 
  ON attendance_records FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance records" 
  ON attendance_records FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance records" 
  ON attendance_records FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own attendance records" 
  ON attendance_records FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own excel files" 
  ON excel_files FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own excel files" 
  ON excel_files FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own excel files" 
  ON excel_files FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own excel files" 
  ON excel_files FOR DELETE 
  USING (auth.uid() = user_id);

-- 创建触发器函数，自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_attendance_records_updated_at 
  BEFORE UPDATE ON attendance_records 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_excel_files_updated_at 
  BEFORE UPDATE ON excel_files 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
