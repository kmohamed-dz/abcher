export type UserRole = "school_admin" | "teacher" | "student" | "parent" | "authority_admin";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole | null;
  school_id?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  wilaya: string;
  address?: string;
  logo_url?: string;
  school_code: string;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  full_name: string;
  level: string;
  parent_phone?: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  full_name: string;
  specialization: string;
  phone?: string;
  created_at: string;
}
