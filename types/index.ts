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
}

export interface ExcelData {
  headers: string[];
  rows: (string | number | null)[][];
}
