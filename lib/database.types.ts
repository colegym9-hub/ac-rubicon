// Hand-authored to match supabase/migrations/0001_init.sql, 0002_add_project_progress.sql,
// and 0003_brain.sql. Literal-union types are kept tighter than the Supabase MCP generator's
// (which widens enums to `string`); when adding tables, mirror the migration here by hand.
// `fts` (a generated tsvector) is exposed on Row only — never written, never selected directly.

export type ProjectStatus = "active" | "someday" | "done" | "archived";
export type ProjectCategory = "finite" | "system" | "habit" | "later";
export type ProgressMode = "auto" | "manual";
export type TaskStatus = "todo" | "doing" | "done" | "blocked" | "dropped";
export type TaskEffort = "quick" | "slot" | "deep";
export type MetricType = "bool" | "count" | "scale" | "duration" | "note";
export type PlanSource = "auto" | "edited";

// ── Brain (0003_brain.sql) literal unions ──
export type RawSourceType =
  | "note" | "youtube" | "instagram" | "tiktok" | "article" | "voice" | "image" | "chat_answer";
export type RawSourceStatus =
  | "raw" | "converting" | "converted" | "ingesting" | "ingested" | "needs_review" | "error";
export type WikiStatus = "active" | "draft" | "archived";
export type BrainContribution = "added" | "updated" | "confirmed";
export type BrainOperation =
  | "ingest" | "query" | "lint" | "create" | "update" | "archive" | "error";
export type BrainTargetType = "raw_source" | "wiki_page" | "brain";
export type BrainReportKind = "lint" | "insight";
export type BrainReportStatus = "pending" | "done" | "error";
export type ChatStatus = "pending" | "answering" | "answered" | "error";
export type ReplanStatus = "pending" | "planning" | "done" | "error";

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
          progress: number;
          progress_mode: ProgressMode;
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
          progress?: number;
          progress_mode?: ProgressMode;
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
          progress?: number;
          progress_mode?: ProgressMode;
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
      raw_sources: {
        Row: {
          id: string;
          type: RawSourceType;
          title: string | null;
          raw_input: string;
          content_md: string | null;
          status: RawSourceStatus;
          error_msg: string | null;
          retry_count: number;
          source_date: string | null;
          tags: string[];
          token_est: number | null;
          fts: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: RawSourceType;
          title?: string | null;
          raw_input: string;
          content_md?: string | null;
          status?: RawSourceStatus;
          error_msg?: string | null;
          retry_count?: number;
          source_date?: string | null;
          tags?: string[];
          token_est?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: RawSourceType;
          title?: string | null;
          raw_input?: string;
          content_md?: string | null;
          status?: RawSourceStatus;
          error_msg?: string | null;
          retry_count?: number;
          source_date?: string | null;
          tags?: string[];
          token_est?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wiki_pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          domain: string;
          overview: string | null;
          content_md: string | null;
          related_slugs: string[];
          status: WikiStatus;
          pinned: boolean;
          version: number;
          last_ingested_at: string | null;
          fts: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          domain: string;
          overview?: string | null;
          content_md?: string | null;
          related_slugs?: string[];
          status?: WikiStatus;
          pinned?: boolean;
          version?: number;
          last_ingested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          domain?: string;
          overview?: string | null;
          content_md?: string | null;
          related_slugs?: string[];
          status?: WikiStatus;
          pinned?: boolean;
          version?: number;
          last_ingested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      raw_source_wiki_pages: {
        Row: {
          id: string;
          source_id: string;
          page_id: string;
          contribution: BrainContribution;
          page_version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          page_id: string;
          contribution?: BrainContribution;
          page_version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          page_id?: string;
          contribution?: BrainContribution;
          page_version?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "raw_source_wiki_pages_source_id_fkey";
            columns: ["source_id"];
            referencedRelation: "raw_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "raw_source_wiki_pages_page_id_fkey";
            columns: ["page_id"];
            referencedRelation: "wiki_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      brain_log: {
        Row: {
          id: string;
          operation: BrainOperation;
          target_type: BrainTargetType | null;
          target_id: string | null;
          summary: string;
          meta: unknown;
          model: string | null;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operation: BrainOperation;
          target_type?: BrainTargetType | null;
          target_id?: string | null;
          summary: string;
          meta?: unknown;
          model?: string | null;
          tokens_used?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          operation?: BrainOperation;
          target_type?: BrainTargetType | null;
          target_id?: string | null;
          summary?: string;
          meta?: unknown;
          model?: string | null;
          tokens_used?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      brain_reports: {
        Row: {
          id: string;
          kind: BrainReportKind;
          week_of: string;
          status: BrainReportStatus;
          issues: unknown;
          summary: string | null;
          model_used: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: BrainReportKind;
          week_of: string;
          status?: BrainReportStatus;
          issues?: unknown;
          summary?: string | null;
          model_used?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: BrainReportKind;
          week_of?: string;
          status?: BrainReportStatus;
          issues?: unknown;
          summary?: string | null;
          model_used?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brain_snippets: {
        Row: {
          id: string;
          key: string;
          label: string;
          value: string;
          active: boolean;
          sort: number;
          wiki_page_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          value: string;
          active?: boolean;
          sort?: number;
          wiki_page_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          value?: string;
          active?: boolean;
          sort?: number;
          wiki_page_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brain_snippets_wiki_page_id_fkey";
            columns: ["wiki_page_id"];
            referencedRelation: "wiki_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      brain_conversations: {
        Row: {
          id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brain_chats: {
        Row: {
          id: string;
          question: string;
          answer: string | null;
          status: ChatStatus;
          citations: unknown;
          error_msg: string | null;
          created_at: string;
          updated_at: string;
          conversation_id: string | null;
        };
        Insert: {
          id?: string;
          question: string;
          answer?: string | null;
          status?: ChatStatus;
          citations?: unknown;
          error_msg?: string | null;
          created_at?: string;
          updated_at?: string;
          conversation_id?: string | null;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string | null;
          status?: ChatStatus;
          citations?: unknown;
          error_msg?: string | null;
          created_at?: string;
          updated_at?: string;
          conversation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "brain_chats_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "brain_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      replan_requests: {
        Row: {
          id: string;
          plan_date: string;
          what_changed: string | null;
          time_left: string | null;
          status: ReplanStatus;
          error_msg: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_date: string;
          what_changed?: string | null;
          time_left?: string | null;
          status?: ReplanStatus;
          error_msg?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_date?: string;
          what_changed?: string | null;
          time_left?: string | null;
          status?: ReplanStatus;
          error_msg?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brain_sops: {
        Row: {
          id: string;
          key: string;
          label: string;
          content_md: string;
          sort: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          content_md?: string;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          content_md?: string;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_notes: {
        Row: {
          id: string;
          project_id: string;
          content_md: string;
          source_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          content_md: string;
          source_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          content_md?: string;
          source_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_notes_source_id_fkey";
            columns: ["source_id"];
            referencedRelation: "raw_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      brain_run_lock: {
        Row: {
          id: boolean;
          fired_at: string;
        };
        Insert: {
          id?: boolean;
          fired_at?: string;
        };
        Update: {
          id?: boolean;
          fired_at?: string;
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

// Brain (0003) convenience aliases.
export type RawSource = Database["public"]["Tables"]["raw_sources"]["Row"];
export type RawSourceInsert = Database["public"]["Tables"]["raw_sources"]["Insert"];
export type RawSourceUpdate = Database["public"]["Tables"]["raw_sources"]["Update"];
export type WikiPage = Database["public"]["Tables"]["wiki_pages"]["Row"];
export type WikiPageInsert = Database["public"]["Tables"]["wiki_pages"]["Insert"];
export type WikiPageUpdate = Database["public"]["Tables"]["wiki_pages"]["Update"];
export type RawSourceWikiPage = Database["public"]["Tables"]["raw_source_wiki_pages"]["Row"];
export type BrainLog = Database["public"]["Tables"]["brain_log"]["Row"];
export type BrainReport = Database["public"]["Tables"]["brain_reports"]["Row"];
export type BrainSnippet = Database["public"]["Tables"]["brain_snippets"]["Row"];
export type BrainChat = Database["public"]["Tables"]["brain_chats"]["Row"];
export type BrainConversation = Database["public"]["Tables"]["brain_conversations"]["Row"];
export type ReplanRequest = Database["public"]["Tables"]["replan_requests"]["Row"];
export type BrainSop = Database["public"]["Tables"]["brain_sops"]["Row"];
export type ProjectNote = Database["public"]["Tables"]["project_notes"]["Row"];
