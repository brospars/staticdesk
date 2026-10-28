
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "auto_replies": {
                  Row: {
                    "body": string,"conditions": NonNullable<Json>,"created_at": string,"delay_minutes": number,"enabled": boolean,"id": string,"name": string,"site_id": string | null,"subject": string,"trigger": Database["public"]['Enums']["auto_reply_trigger"],"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conditions"?: NonNullable<Json>,"created_at"?: string,"delay_minutes"?: number,"enabled"?: boolean,"id"?: string,"name": string,"site_id"?: string | null,"subject": string,"trigger"?: Database["public"]['Enums']["auto_reply_trigger"],"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "body"?: string,"conditions"?: NonNullable<Json>,"created_at"?: string,"delay_minutes"?: number,"enabled"?: boolean,"id"?: string,"name"?: string,"site_id"?: string | null,"subject"?: string,"trigger"?: Database["public"]['Enums']["auto_reply_trigger"],"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "auto_replies_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "auto_replies_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"blocked_fingerprints": {
                  Row: {
                    "blocked_by": string | null,"created_at": string,"fingerprint_hash": string,"id": string,"reason": string | null,"site_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_by"?: string | null,"created_at"?: string,"fingerprint_hash": string,"id"?: string,"reason"?: string | null,"site_id": string,"workspace_id": string
                  }
                  Update: {
                    "blocked_by"?: string | null,"created_at"?: string,"fingerprint_hash"?: string,"id"?: string,"reason"?: string | null,"site_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocked_fingerprints_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_email": string | null,"author_name": string | null,"body": string,"created_at": string,"edit_token_hash": string | null,"edited_at": string | null,"fingerprint_hash": string | null,"id": string,"is_anonymous": boolean,"page_id": string,"page_url": string | null,"parent_id": string | null,"site_id": string,"status": Database["public"]['Enums']["moderation_status"],"updated_at": string,"widget_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_email"?: string | null,"author_name"?: string | null,"body": string,"created_at"?: string,"edit_token_hash"?: string | null,"edited_at"?: string | null,"fingerprint_hash"?: string | null,"id"?: string,"is_anonymous"?: boolean,"page_id": string,"page_url"?: string | null,"parent_id"?: string | null,"site_id": string,"status"?: Database["public"]['Enums']["moderation_status"],"updated_at"?: string,"widget_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "author_email"?: string | null,"author_name"?: string | null,"body"?: string,"created_at"?: string,"edit_token_hash"?: string | null,"edited_at"?: string | null,"fingerprint_hash"?: string | null,"id"?: string,"is_anonymous"?: boolean,"page_id"?: string,"page_url"?: string | null,"parent_id"?: string | null,"site_id"?: string,"status"?: Database["public"]['Enums']["moderation_status"],"updated_at"?: string,"widget_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "comments_widget_id_workspace_id_fkey"
      columns: ["widget_id","workspace_id"]
isOneToOne: false
      referencedRelation: "widgets"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "created_at": string,"email": string,"email_suppressed_at": string | null,"email_suppression_reason": string | null,"id": string,"name": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"email_suppressed_at"?: string | null,"email_suppression_reason"?: string | null,"id"?: string,"name"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"email_suppressed_at"?: string | null,"email_suppression_reason"?: string | null,"id"?: string,"name"?: string | null,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "id": number,"metadata": NonNullable<Json>,"occurred_at": string,"page_id": string | null,"site_id": string,"type": Database["public"]['Enums']["event_type"],"widget_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"metadata"?: NonNullable<Json>,"occurred_at"?: string,"page_id"?: string | null,"site_id": string,"type": Database["public"]['Enums']["event_type"],"widget_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "id"?: never,"metadata"?: NonNullable<Json>,"occurred_at"?: string,"page_id"?: string | null,"site_id"?: string,"type"?: Database["public"]['Enums']["event_type"],"widget_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "events_widget_id_workspace_id_fkey"
      columns: ["widget_id","workspace_id"]
isOneToOne: false
      referencedRelation: "widgets"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"role": Database["public"]['Enums']["member_role"],"token_hash": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"token_hash": string,"workspace_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"token_hash"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"direction": Database["public"]['Enums']["message_direction"],"email_message_id": string | null,"id": string,"metadata": NonNullable<Json>,"thread_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"direction": Database["public"]['Enums']["message_direction"],"email_message_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"thread_id": string,"workspace_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"direction"?: Database["public"]['Enums']["message_direction"],"email_message_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"thread_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_thread_id_workspace_id_fkey"
      columns: ["thread_id","workspace_id"]
isOneToOne: false
      referencedRelation: "threads"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "daily_digest": boolean,"new_threads": string,"replies": string,"updated_at": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "daily_digest"?: boolean,"new_threads"?: string,"replies"?: string,"updated_at"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "daily_digest"?: boolean,"new_threads"?: string,"replies"?: string,"updated_at"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_workspace_id_user_id_fkey"
      columns: ["workspace_id","user_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["workspace_id","user_id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reactions": {
                  Row: {
                    "comment": string | null,"created_at": string,"fingerprint_hash": string,"id": string,"kind": string,"page_id": string,"site_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"fingerprint_hash": string,"id"?: string,"kind": string,"page_id": string,"site_id": string,"workspace_id": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"fingerprint_hash"?: string,"id"?: string,"kind"?: string,"page_id"?: string,"site_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reactions_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "author_email": string | null,"author_name": string | null,"body": string | null,"created_at": string,"edit_token_hash": string | null,"fingerprint_hash": string | null,"id": string,"is_anonymous": boolean,"page_id": string | null,"rating": number,"site_id": string,"status": Database["public"]['Enums']["moderation_status"],"title": string | null,"updated_at": string,"widget_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_email"?: string | null,"author_name"?: string | null,"body"?: string | null,"created_at"?: string,"edit_token_hash"?: string | null,"fingerprint_hash"?: string | null,"id"?: string,"is_anonymous"?: boolean,"page_id"?: string | null,"rating": number,"site_id": string,"status"?: Database["public"]['Enums']["moderation_status"],"title"?: string | null,"updated_at"?: string,"widget_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "author_email"?: string | null,"author_name"?: string | null,"body"?: string | null,"created_at"?: string,"edit_token_hash"?: string | null,"fingerprint_hash"?: string | null,"id"?: string,"is_anonymous"?: boolean,"page_id"?: string | null,"rating"?: number,"site_id"?: string,"status"?: Database["public"]['Enums']["moderation_status"],"title"?: string | null,"updated_at"?: string,"widget_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "reviews_widget_id_workspace_id_fkey"
      columns: ["widget_id","workspace_id"]
isOneToOne: false
      referencedRelation: "widgets"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"saved_replies": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"id": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_replies_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"sending_domains": {
                  Row: {
                    "created_at": string,"domain": string,"from_local_part": string,"provider_id": string | null,"records": NonNullable<Json>,"status": string,"updated_at": string,"verified_at": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain": string,"from_local_part"?: string,"provider_id"?: string | null,"records"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"verified_at"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"domain"?: string,"from_local_part"?: string,"provider_id"?: string | null,"records"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"verified_at"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sending_domains_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: true
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"sites": {
                  Row: {
                    "allowed_origins": (string)[],"created_at": string,"id": string,"name": string,"public_key": string,"settings": NonNullable<Json>,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed_origins"?: (string)[],"created_at"?: string,"id"?: string,"name": string,"public_key"?: string,"settings"?: NonNullable<Json>,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "allowed_origins"?: (string)[],"created_at"?: string,"id"?: string,"name"?: string,"public_key"?: string,"settings"?: NonNullable<Json>,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sites_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "cancel_at_period_end": boolean,"created_at": string,"current_period_end": string | null,"status": string,"stripe_price_id": string,"stripe_subscription_id": string,"trial_end": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"status": string,"stripe_price_id": string,"stripe_subscription_id": string,"trial_end"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"status"?: string,"stripe_price_id"?: string,"stripe_subscription_id"?: string,"trial_end"?: string | null,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: true
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"threads": {
                  Row: {
                    "assignee_id": string | null,"contact_id": string,"created_at": string,"id": string,"labels": (string)[],"last_message_at": string,"site_id": string,"status": Database["public"]['Enums']["thread_status"],"subject": string | null,"updated_at": string,"widget_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"contact_id": string,"created_at"?: string,"id"?: string,"labels"?: (string)[],"last_message_at"?: string,"site_id": string,"status"?: Database["public"]['Enums']["thread_status"],"subject"?: string | null,"updated_at"?: string,"widget_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"contact_id"?: string,"created_at"?: string,"id"?: string,"labels"?: (string)[],"last_message_at"?: string,"site_id"?: string,"status"?: Database["public"]['Enums']["thread_status"],"subject"?: string | null,"updated_at"?: string,"widget_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "threads_contact_id_workspace_id_fkey"
      columns: ["contact_id","workspace_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "threads_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "threads_widget_id_workspace_id_fkey"
      columns: ["widget_id","workspace_id"]
isOneToOne: false
      referencedRelation: "widgets"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"webhooks": {
                  Row: {
                    "created_at": string,"enabled": boolean,"events": string[],"id": string,"kind": Database["public"]['Enums']["webhook_kind"],"last_delivery_at": string | null,"last_error": string | null,"last_status": number | null,"secret": string,"site_id": string,"updated_at": string,"url": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"enabled"?: boolean,"events"?: string[],"id"?: string,"kind"?: Database["public"]['Enums']["webhook_kind"],"last_delivery_at"?: string | null,"last_error"?: string | null,"last_status"?: number | null,"secret"?: string,"site_id": string,"updated_at"?: string,"url": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"enabled"?: boolean,"events"?: string[],"id"?: string,"kind"?: Database["public"]['Enums']["webhook_kind"],"last_delivery_at"?: string | null,"last_error"?: string | null,"last_status"?: number | null,"secret"?: string,"site_id"?: string,"updated_at"?: string,"url"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "webhooks_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"widgets": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"enabled": boolean,"id": string,"kind": Database["public"]['Enums']["widget_kind"],"name": string,"site_id": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"enabled"?: boolean,"id"?: string,"kind": Database["public"]['Enums']["widget_kind"],"name": string,"site_id": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"enabled"?: boolean,"id"?: string,"kind"?: Database["public"]['Enums']["widget_kind"],"name"?: string,"site_id"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "widgets_site_id_workspace_id_fkey"
      columns: ["site_id","workspace_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"plan": Database["public"]['Enums']["plan"],"slug": string,"stripe_customer_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"plan"?: Database["public"]['Enums']["plan"],"slug": string,"stripe_customer_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"plan"?: Database["public"]['Enums']["plan"],"slug"?: string,"stripe_customer_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_workspace":
{ Args: { "name": string,"slug": string }; Returns: {
              "created_at": string,
"id": string,
"name": string,
"plan": Database["public"]['Enums']["plan"],
"slug": string,
"stripe_customer_id": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "workspaces"
        isOneToOne: true
        isSetofReturn: false
      } },
"hit_rate_limit":
{ Args: { "bucket": string,"max_hits": number,"window_seconds": number }; Returns: boolean
                           },
"receive_email_reply":
{ Args: { "body": string,"email_message_id": string,"from_email"?: string,"metadata"?: Json,"thread_id": string }; Returns: string
                           },
"search_threads":
{ Args: { "assignee"?: string,"label"?: string,"query"?: string,"site"?: string,"statuses"?: Database["public"]['Enums']["thread_status"][],"unassigned"?: boolean,"ws": string }; Returns: Database["public"]["Tables"]["threads"]["Row"][]
                          SetofOptions: {
        from: "*"
        to: "threads"
        isOneToOne: false
        isSetofReturn: true
      } },
"submit_contact":
{ Args: { "email": string,"fields"?: Json,"message": string,"name"?: string,"page_id": string,"page_url"?: string,"site_id": string,"widget_id"?: string }; Returns: string
                           },
"suppress_email":
{ Args: { "address": string,"reason": string }; Returns: number
                           },
"workspace_members":
{ Args: { "ws": string }; Returns: {
              "email": string,"joined_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
            }[]
                           },
"workspace_notification_emails":
{ Args: { "kind"?: string,"thread"?: string,"ws": string }; Returns: string[]
                           },
"workspace_thread_labels":
{ Args: { "ws": string }; Returns: string[]
                           }
          }
          Enums: {
            "auto_reply_trigger": "new_thread"|"outside_hours","event_type": "view"|"open"|"submit"|"comment"|"reaction"|"review","member_role": "owner"|"admin"|"member","message_direction": "inbound"|"outbound"|"note","moderation_status": "pending"|"approved"|"rejected"|"spam","plan": "free"|"pro"|"team","thread_status": "open"|"pending"|"resolved","webhook_kind": "custom"|"slack"|"discord","widget_kind": "contact"|"comments"|"reactions"|"reviews"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "auto_reply_trigger": ["new_thread", "outside_hours"],"event_type": ["view", "open", "submit", "comment", "reaction", "review"],"member_role": ["owner", "admin", "member"],"message_direction": ["inbound", "outbound", "note"],"moderation_status": ["pending", "approved", "rejected", "spam"],"plan": ["free", "pro", "team"],"thread_status": ["open", "pending", "resolved"],"webhook_kind": ["custom", "slack", "discord"],"widget_kind": ["contact", "comments", "reactions", "reviews"]
          }
        }
} as const
