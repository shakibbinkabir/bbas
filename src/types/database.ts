/**
 * Supabase database types.
 *
 * These types mirror the SQL schema in supabase/migrations/00001_initial_schema.sql
 * exactly. Whenever the migrations change, update this file too.
 *
 * In a CI workflow these can be regenerated with:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// =============================================================================
// ENUMS
// =============================================================================
export type UserRole = 'owner' | 'officer' | 'admin';

export type AppStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'information_requested'
  | 'corrections_submitted'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type BuildingType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'mixed'
  | 'institutional';

export type DocumentType =
  | 'land_deed'
  | 'khatian_certificate'
  | 'mutation_certificate'
  | 'tax_clearance'
  | 'architectural_plan'
  | 'structural_plan'
  | 'soil_test_report'
  | 'eia_report'
  | 'fire_noc'
  | 'applicant_nid'
  | 'owner_photo'
  | 'site_photo'
  | 'other';

export type UploadStatus = 'uploading' | 'uploaded' | 'verified' | 'rejected';

export type WorkflowAction =
  | 'submit'
  | 'advance'
  | 'return'
  | 'reject'
  | 'approve'
  | 'withdraw'
  | 'comment'
  | 'score'
  | 'assign';

export type NotificationType =
  | 'stage_advance'
  | 'information_requested'
  | 'approved'
  | 'rejected'
  | 'welcome'
  | 'reminder'
  | 'submission_confirmed'
  | 'corrections_reviewed'
  | 'assignment';

export type DeliveryStatus = 'pending' | 'sent' | 'failed';
export type LanguagePref = 'bn' | 'en';
export type ThemePref = 'light' | 'dark';

// =============================================================================
// TABLES
// =============================================================================
export interface Database {
  public: {
    Tables: {
      authorities: {
        Row: {
          id: string;
          code: string;
          name_en: string;
          name_bn: string;
          jurisdiction_en: string | null;
          jurisdiction_bn: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name_en: string;
          name_bn: string;
          jurisdiction_en?: string | null;
          jurisdiction_bn?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name_en?: string;
          name_bn?: string;
          jurisdiction_en?: string | null;
          jurisdiction_bn?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name_en: string | null;
          full_name_bn: string | null;
          phone: string;
          email: string | null;
          authority_id: string | null;
          preferred_language: LanguagePref;
          preferred_theme: ThemePref;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          full_name_en?: string | null;
          full_name_bn?: string | null;
          phone: string;
          email?: string | null;
          authority_id?: string | null;
          preferred_language?: LanguagePref;
          preferred_theme?: ThemePref;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name_en?: string | null;
          full_name_bn?: string | null;
          phone?: string;
          email?: string | null;
          authority_id?: string | null;
          preferred_language?: LanguagePref;
          preferred_theme?: ThemePref;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_authority_id_fkey';
            columns: ['authority_id'];
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
        ];
      };

      applications: {
        Row: {
          id: string;
          application_number: string;
          owner_id: string;
          authority_id: string;
          assigned_officer_id: string | null;
          status: AppStatus;
          current_stage: number;
          project_name_en: string | null;
          project_name_bn: string | null;
          building_type: BuildingType;
          num_floors: number | null;
          total_area_sqft: number | null;
          estimated_cost_bdt: number | null;
          land_mouza: string | null;
          land_khatian_no: string | null;
          land_dag_no: string | null;
          land_area_katha: number | null;
          land_address_en: string | null;
          land_address_bn: string | null;
          land_latitude: number | null;
          land_longitude: number | null;
          has_solar_panel: boolean;
          has_rainwater_harvest: boolean;
          has_green_roof: boolean;
          has_ev_charging: boolean;
          green_description: string | null;
          ai_compliance_score: number | null;
          ai_scored_at: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_number: string;
          owner_id: string;
          authority_id: string;
          assigned_officer_id?: string | null;
          status?: AppStatus;
          current_stage?: number;
          project_name_en?: string | null;
          project_name_bn?: string | null;
          building_type: BuildingType;
          num_floors?: number | null;
          total_area_sqft?: number | null;
          estimated_cost_bdt?: number | null;
          land_mouza?: string | null;
          land_khatian_no?: string | null;
          land_dag_no?: string | null;
          land_area_katha?: number | null;
          land_address_en?: string | null;
          land_address_bn?: string | null;
          land_latitude?: number | null;
          land_longitude?: number | null;
          has_solar_panel?: boolean;
          has_rainwater_harvest?: boolean;
          has_green_roof?: boolean;
          has_ev_charging?: boolean;
          green_description?: string | null;
          ai_compliance_score?: number | null;
          ai_scored_at?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'applications_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_authority_id_fkey';
            columns: ['authority_id'];
            referencedRelation: 'authorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_assigned_officer_id_fkey';
            columns: ['assigned_officer_id'];
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      application_documents: {
        Row: {
          id: string;
          application_id: string;
          document_type: DocumentType;
          file_name: string;
          file_path: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          upload_status: UploadStatus;
          officer_remarks: string | null;
          ai_score: number | null;
          ai_findings: Json | null;
          uploaded_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          document_type: DocumentType;
          file_name: string;
          file_path: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          upload_status?: UploadStatus;
          officer_remarks?: string | null;
          ai_score?: number | null;
          ai_findings?: Json | null;
          uploaded_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['application_documents']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'application_documents_application_id_fkey';
            columns: ['application_id'];
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };

      workflow_history: {
        Row: {
          id: string;
          application_id: string;
          from_stage: number | null;
          to_stage: number;
          from_status: string | null;
          to_status: string;
          action: WorkflowAction;
          performed_by: string | null;
          comments: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          from_stage?: number | null;
          to_stage: number;
          from_status?: string | null;
          to_status: string;
          action: WorkflowAction;
          performed_by?: string | null;
          comments?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['workflow_history']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'workflow_history_application_id_fkey';
            columns: ['application_id'];
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workflow_history_performed_by_fkey';
            columns: ['performed_by'];
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      ai_scoring_results: {
        Row: {
          id: string;
          application_id: string;
          document_id: string | null;
          overall_score: number;
          findings: Json;
          recommendations: Json | null;
          raw_response: string | null;
          model_version: string | null;
          tokens_used: number | null;
          scored_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          document_id?: string | null;
          overall_score: number;
          findings: Json;
          recommendations?: Json | null;
          raw_response?: string | null;
          model_version?: string | null;
          tokens_used?: number | null;
          scored_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ai_scoring_results']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'ai_scoring_results_application_id_fkey';
            columns: ['application_id'];
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_scoring_results_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'application_documents';
            referencedColumns: ['id'];
          },
        ];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          type: NotificationType;
          channel: string;
          subject_en: string | null;
          subject_bn: string | null;
          body_en: string | null;
          body_bn: string | null;
          sent_at: string | null;
          delivery_status: DeliveryStatus;
          error_message: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          type: NotificationType;
          channel?: string;
          subject_en?: string | null;
          subject_bn?: string | null;
          body_en?: string | null;
          body_bn?: string | null;
          sent_at?: string | null;
          delivery_status?: DeliveryStatus;
          error_message?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_application_id_fkey';
            columns: ['application_id'];
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: { [_ in never]: never };

    Functions: {
      generate_application_number: {
        Args: { auth_code: string };
        Returns: string;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      current_user_authority: {
        Args: Record<string, never>;
        Returns: string;
      };
    };

    Enums: {
      user_role: UserRole;
      app_status: AppStatus;
      building_type: BuildingType;
      document_type: DocumentType;
      upload_status: UploadStatus;
      workflow_action: WorkflowAction;
      notification_type: NotificationType;
      delivery_status: DeliveryStatus;
      language_pref: LanguagePref;
      theme_pref: ThemePref;
    };

    CompositeTypes: { [_ in never]: never };
  };
}

// =============================================================================
// CONVENIENCE ROW TYPES
// =============================================================================
export type AuthorityRow = Database['public']['Tables']['authorities']['Row'];
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
export type ApplicationRow = Database['public']['Tables']['applications']['Row'];
export type ApplicationDocumentRow =
  Database['public']['Tables']['application_documents']['Row'];
export type WorkflowHistoryRow = Database['public']['Tables']['workflow_history']['Row'];
export type AIScoringResultRow = Database['public']['Tables']['ai_scoring_results']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
