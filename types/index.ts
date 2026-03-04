export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  file_id?: string;
  employee_name: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'overtime';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExcelFile {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  row_count: number;
  created_at: string;
  updated_at: string;
  is_shared?: boolean;
  shared_by?: string;
}

export interface EditHistory {
  id: string;
  file_id: string;
  user_id: string;
  record_id?: string;
  action: 'create' | 'update' | 'delete';
  row_index?: number;
  col_index?: number;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
  file_name?: string;
  user_name?: string;
  user_email?: string;
}

export interface SharedFile {
  id: string;
  file_name: string;
  file_size: number;
  row_count: number;
  created_at: string;
  updated_at: string;
  is_shared: boolean;
  shared_by?: string;
  uploader_name?: string;
  uploader_email?: string;
  shared_by_name?: string;
}

export interface ExcelData {
  headers: string[];
  rows: (string | number | null)[][];
}
