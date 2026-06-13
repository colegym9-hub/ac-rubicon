// Hand-authored to match supabase/migrations/0001_init.sql.
// Once the project is provisioned, regenerate with the Supabase MCP
// (generate_typescript_types) and replace this file; keep shapes in sync until then.

export type ProjectStatus = "active" | "someday" | "done" | "archived";
export type ProjectCategory = "finite" | "system" | "habit" | "later";
export type TaskStatus = "todo" | "doing" | "done" | "blocked" | "dropped";
export type TaskEffort = "quick" | "slot" | "deep";
export type MetricType = "bool" | "count" | "scale" | "duration" | "note";
export type PlanSource = "auto" | "edited";

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          priority: number;
          status: ProjectStatus;
          category: ProjectCategory | null;
          brain_ref: string | null;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          priority?: number;
          status?: ProjectStatus;
          category?: ProjectCategory | null;
          brain_ref?: string | null;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          priority?: number;
          status?: ProjectStatus;
          category?: ProjectCategory | null;
          brain_ref?: string | null;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          project_id: string | null;
          priority: number;
          status: TaskStatus;
          effort: TaskEffort;
          est_minutes: number | null;
          due: string | null;
          scheduled_for: string | null;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          project_id?: string | null;
          priority?: number;
          status?: TaskStatus;
          effort?: TaskEffort;
          est_minutes?: number | null;
          due?: string | null;
          scheduled_for?: string | null;
          notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          project_id?: string | null;
          priority?: number;
          status?: TaskStatus;
          effort?: TaskEffort;
          est_minutes?: number | null;
          due?: string | null;
          scheduled_for?: string | null;
          notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      tracking_metrics: {
        Row: {
          id: string;
          key: string;
          label: string;
          type: MetricType;
          active: boolean;
          sort: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          type: MetricType;
          active?: boolean;
          sort?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          type?: MetricType;
          active?: boolean;
          sort?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      tracking_entries: {
        Row: {
          id: string;
          metric_id: string;
          date: string;
          value_num: number | null;
          value_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          metric_id: string;
          date: string;
          value_num?: number | null;
          value_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          metric_id?: string;
          date?: string;
          value_num?: number | null;
          value_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_entries_metric_id_fkey";
            columns: ["metric_id"];
            referencedRelation: "tracking_metrics";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_logs: {
        Row: {
          id: string;
          date: string;
          recap_text: string | null;
          slots_done: number | null;
          slots_slipped: string | null;
          energy: number | null;
          parsed: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          recap_text?: string | null;
          slots_done?: number | null;
          slots_slipped?: string | null;
          energy?: number | null;
          parsed?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          recap_text?: string | null;
          slots_done?: number | null;
          slots_slipped?: string | null;
          energy?: number | null;
          parsed?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_plans: {
        Row: {
          id: string;
          date: string;
          blocks: unknown;
          source: PlanSource;
          calendar_synced: boolean;
          rationale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          blocks?: unknown;
          source?: PlanSource;
          calendar_synced?: boolean;
          rationale?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          blocks?: unknown;
          source?: PlanSource;
          calendar_synced?: boolean;
          rationale?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      task_weights: {
        Row: {
          id: string;
          title: string;
          project_id: string | null;
          priority: number;
          status: TaskStatus;
          effort: TaskEffort;
          est_minutes: number | null;
          due: string | null;
          scheduled_for: string | null;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          weight: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience domain aliases for the app layer.
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type TaskWithWeight = Database["public"]["Views"]["task_weights"]["Row"];
export type TrackingMetric = Database["public"]["Tables"]["tracking_metrics"]["Row"];
export type TrackingEntry = Database["public"]["Tables"]["tracking_entries"]["Row"];
export type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
export type DailyPlan = Database["public"]["Tables"]["daily_plans"]["Row"];
