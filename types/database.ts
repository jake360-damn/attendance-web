export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          file_id: string | null
          employee_name: string
          date: string
          check_in: string | null
          check_out: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_id?: string | null
          employee_name: string
          date: string
          check_in?: string | null
          check_out?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string | null
          employee_name?: string
          date?: string
          check_in?: string | null
          check_out?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "excel_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      excel_files: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size: number
          row_count: number
          created_at: string
          updated_at: string
          is_shared: boolean
          shared_by: string | null
          original_headers: string[] | null
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_size?: number
          row_count?: number
          created_at?: string
          updated_at?: string
          is_shared?: boolean
          shared_by?: string | null
          original_headers?: string[] | null
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size?: number
          row_count?: number
          created_at?: string
          updated_at?: string
          is_shared?: boolean
          shared_by?: string | null
          original_headers?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "excel_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excel_files_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      edit_history: {
        Row: {
          id: string
          file_id: string
          user_id: string | null
          record_id: string | null
          action: string
          row_index: number | null
          col_index: number | null
          field_name: string | null
          old_value: string | null
          new_value: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          file_id: string
          user_id?: string | null
          record_id?: string | null
          action: string
          row_index?: number | null
          col_index?: number | null
          field_name?: string | null
          old_value?: string | null
          new_value?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          user_id?: string | null
          record_id?: string | null
          action?: string
          row_index?: number | null
          col_index?: number | null
          field_name?: string | null
          old_value?: string | null
          new_value?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edit_history_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "excel_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_history_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          }
        ]
      }
      excel_data_raw: {
        Row: {
          id: string
          file_id: string
          headers: string[]
          rows: any
          column_widths: number[] | null
          row_heights: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          file_id: string
          headers: string[]
          rows: any
          column_widths?: number[] | null
          row_heights?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          headers?: string[]
          rows?: any
          column_widths?: number[] | null
          row_heights?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "excel_data_raw_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "excel_files"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      edit_history_with_user: {
        Row: {
          id: string
          file_id: string
          user_id: string | null
          record_id: string | null
          action: string
          row_index: number | null
          col_index: number | null
          field_name: string | null
          old_value: string | null
          new_value: string | null
          description: string | null
          created_at: string
          file_name: string | null
          user_name: string | null
          user_email: string | null
        }
        Relationships: []
      }
      shared_files_with_uploader: {
        Row: {
          id: string
          file_name: string
          file_size: number
          row_count: number
          created_at: string
          updated_at: string
          is_shared: boolean
          shared_by: string | null
          uploader_name: string | null
          uploader_email: string | null
          shared_by_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
