npm warn exec The following package was not found and will be installed: supabase@2.107.0
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      food_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          client_id: string
          created_at: string
          fat_g: number | null
          id: string
          image_path: string | null
          logged_at: string
          meal_slot_id: string | null
          notes: string | null
          protein_g: number | null
          trainer_id: string
          transcription_failed: boolean
          updated_at: string
          verification_status: string
          wam_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          client_id: string
          created_at?: string
          fat_g?: number | null
          id?: string
          image_path?: string | null
          logged_at?: string
          meal_slot_id?: string | null
          notes?: string | null
          protein_g?: number | null
          trainer_id: string
          transcription_failed?: boolean
          updated_at?: string
          verification_status?: string
          wam_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          client_id?: string
          created_at?: string
          fat_g?: number | null
          id?: string
          image_path?: string | null
          logged_at?: string
          meal_slot_id?: string | null
          notes?: string | null
          protein_g?: number | null
          trainer_id?: string
          transcription_failed?: boolean
          updated_at?: string
          verification_status?: string
          wam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_meal_slot_id_fkey"
            columns: ["meal_slot_id"]
            isOneToOne: false
            referencedRelation: "meal_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_webhook_logs: {
        Row: {
          client_phone: string
          id: string
          message_type: string
          processed_at: string | null
          received_at: string
          status: string
          wam_id: string
        }
        Insert: {
          client_phone: string
          id?: string
          message_type: string
          processed_at?: string | null
          received_at?: string
          status?: string
          wam_id: string
        }
        Update: {
          client_phone?: string
          id?: string
          message_type?: string
          processed_at?: string | null
          received_at?: string
          status?: string
          wam_id?: string
        }
        Relationships: []
      }
      mastra_agent_versions: {
        Row: {
          agentId: string
          agents: Json | null
          browser: Json | null
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          defaultOptions: Json | null
          description: string | null
          id: string
          inputProcessors: Json | null
          instructions: string
          integrationTools: Json | null
          mcpClients: Json | null
          memory: Json | null
          model: Json
          name: string
          outputProcessors: Json | null
          requestContextSchema: Json | null
          scorers: Json | null
          skills: Json | null
          skillsFormat: string | null
          toolProviders: Json | null
          tools: Json | null
          versionNumber: number
          workflows: Json | null
          workspace: Json | null
        }
        Insert: {
          agentId: string
          agents?: Json | null
          browser?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          defaultOptions?: Json | null
          description?: string | null
          id: string
          inputProcessors?: Json | null
          instructions: string
          integrationTools?: Json | null
          mcpClients?: Json | null
          memory?: Json | null
          model: Json
          name: string
          outputProcessors?: Json | null
          requestContextSchema?: Json | null
          scorers?: Json | null
          skills?: Json | null
          skillsFormat?: string | null
          toolProviders?: Json | null
          tools?: Json | null
          versionNumber: number
          workflows?: Json | null
          workspace?: Json | null
        }
        Update: {
          agentId?: string
          agents?: Json | null
          browser?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          defaultOptions?: Json | null
          description?: string | null
          id?: string
          inputProcessors?: Json | null
          instructions?: string
          integrationTools?: Json | null
          mcpClients?: Json | null
          memory?: Json | null
          model?: Json
          name?: string
          outputProcessors?: Json | null
          requestContextSchema?: Json | null
          scorers?: Json | null
          skills?: Json | null
          skillsFormat?: string | null
          toolProviders?: Json | null
          tools?: Json | null
          versionNumber?: number
          workflows?: Json | null
          workspace?: Json | null
        }
        Relationships: []
      }
      mastra_agents: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          favoriteCount: number | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
          visibility: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      mastra_ai_spans: {
        Row: {
          attributes: Json | null
          createdAt: string
          createdAtZ: string | null
          endedAt: string | null
          endedAtZ: string | null
          entityId: string | null
          entityName: string | null
          entityType: string | null
          entityVersionId: string | null
          environment: string | null
          error: Json | null
          experimentId: string | null
          input: Json | null
          isEvent: boolean
          links: Json | null
          metadata: Json | null
          name: string
          organizationId: string | null
          output: Json | null
          parentEntityId: string | null
          parentEntityName: string | null
          parentEntityType: string | null
          parentEntityVersionId: string | null
          parentSpanId: string | null
          requestContext: Json | null
          requestId: string | null
          resourceId: string | null
          rootEntityId: string | null
          rootEntityName: string | null
          rootEntityType: string | null
          rootEntityVersionId: string | null
          runId: string | null
          scope: Json | null
          serviceName: string | null
          sessionId: string | null
          source: string | null
          spanId: string
          spanType: string
          startedAt: string
          startedAtZ: string | null
          tags: Json | null
          threadId: string | null
          traceId: string
          updatedAt: string | null
          updatedAtZ: string | null
          userId: string | null
        }
        Insert: {
          attributes?: Json | null
          createdAt: string
          createdAtZ?: string | null
          endedAt?: string | null
          endedAtZ?: string | null
          entityId?: string | null
          entityName?: string | null
          entityType?: string | null
          entityVersionId?: string | null
          environment?: string | null
          error?: Json | null
          experimentId?: string | null
          input?: Json | null
          isEvent: boolean
          links?: Json | null
          metadata?: Json | null
          name: string
          organizationId?: string | null
          output?: Json | null
          parentEntityId?: string | null
          parentEntityName?: string | null
          parentEntityType?: string | null
          parentEntityVersionId?: string | null
          parentSpanId?: string | null
          requestContext?: Json | null
          requestId?: string | null
          resourceId?: string | null
          rootEntityId?: string | null
          rootEntityName?: string | null
          rootEntityType?: string | null
          rootEntityVersionId?: string | null
          runId?: string | null
          scope?: Json | null
          serviceName?: string | null
          sessionId?: string | null
          source?: string | null
          spanId: string
          spanType: string
          startedAt: string
          startedAtZ?: string | null
          tags?: Json | null
          threadId?: string | null
          traceId: string
          updatedAt?: string | null
          updatedAtZ?: string | null
          userId?: string | null
        }
        Update: {
          attributes?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          endedAt?: string | null
          endedAtZ?: string | null
          entityId?: string | null
          entityName?: string | null
          entityType?: string | null
          entityVersionId?: string | null
          environment?: string | null
          error?: Json | null
          experimentId?: string | null
          input?: Json | null
          isEvent?: boolean
          links?: Json | null
          metadata?: Json | null
          name?: string
          organizationId?: string | null
          output?: Json | null
          parentEntityId?: string | null
          parentEntityName?: string | null
          parentEntityType?: string | null
          parentEntityVersionId?: string | null
          parentSpanId?: string | null
          requestContext?: Json | null
          requestId?: string | null
          resourceId?: string | null
          rootEntityId?: string | null
          rootEntityName?: string | null
          rootEntityType?: string | null
          rootEntityVersionId?: string | null
          runId?: string | null
          scope?: Json | null
          serviceName?: string | null
          sessionId?: string | null
          source?: string | null
          spanId?: string
          spanType?: string
          startedAt?: string
          startedAtZ?: string | null
          tags?: Json | null
          threadId?: string | null
          traceId?: string
          updatedAt?: string | null
          updatedAtZ?: string | null
          userId?: string | null
        }
        Relationships: []
      }
      mastra_background_tasks: {
        Row: {
          agent_id: string
          args: Json
          completedAt: string | null
          completedAtZ: string | null
          createdAt: string
          createdAtZ: string | null
          error: Json | null
          id: string
          max_retries: number
          resource_id: string | null
          result: Json | null
          retry_count: number
          run_id: string
          startedAt: string | null
          startedAtZ: string | null
          status: string
          suspend_payload: Json | null
          suspendedAt: string | null
          suspendedAtZ: string | null
          thread_id: string | null
          timeout_ms: number
          tool_call_id: string
          tool_name: string
        }
        Insert: {
          agent_id: string
          args: Json
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt: string
          createdAtZ?: string | null
          error?: Json | null
          id: string
          max_retries: number
          resource_id?: string | null
          result?: Json | null
          retry_count: number
          run_id: string
          startedAt?: string | null
          startedAtZ?: string | null
          status: string
          suspend_payload?: Json | null
          suspendedAt?: string | null
          suspendedAtZ?: string | null
          thread_id?: string | null
          timeout_ms: number
          tool_call_id: string
          tool_name: string
        }
        Update: {
          agent_id?: string
          args?: Json
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt?: string
          createdAtZ?: string | null
          error?: Json | null
          id?: string
          max_retries?: number
          resource_id?: string | null
          result?: Json | null
          retry_count?: number
          run_id?: string
          startedAt?: string | null
          startedAtZ?: string | null
          status?: string
          suspend_payload?: Json | null
          suspendedAt?: string | null
          suspendedAtZ?: string | null
          thread_id?: string | null
          timeout_ms?: number
          tool_call_id?: string
          tool_name?: string
        }
        Relationships: []
      }
      mastra_channel_config: {
        Row: {
          data: Json
          platform: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          data: Json
          platform: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          data?: Json
          platform?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_channel_installations: {
        Row: {
          agentId: string
          configHash: string | null
          createdAt: string
          createdAtZ: string | null
          data: Json
          error: string | null
          id: string
          platform: string
          status: string
          updatedAt: string
          updatedAtZ: string | null
          webhookId: string | null
        }
        Insert: {
          agentId: string
          configHash?: string | null
          createdAt: string
          createdAtZ?: string | null
          data: Json
          error?: string | null
          id: string
          platform: string
          status: string
          updatedAt: string
          updatedAtZ?: string | null
          webhookId?: string | null
        }
        Update: {
          agentId?: string
          configHash?: string | null
          createdAt?: string
          createdAtZ?: string | null
          data?: Json
          error?: string | null
          id?: string
          platform?: string
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
          webhookId?: string | null
        }
        Relationships: []
      }
      mastra_dataset_items: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          datasetId: string
          datasetVersion: number
          expectedTrajectory: Json | null
          groundTruth: Json | null
          id: string
          input: Json
          isDeleted: boolean
          metadata: Json | null
          requestContext: Json | null
          source: Json | null
          updatedAt: string
          updatedAtZ: string | null
          validTo: number | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          datasetId: string
          datasetVersion: number
          expectedTrajectory?: Json | null
          groundTruth?: Json | null
          id: string
          input: Json
          isDeleted: boolean
          metadata?: Json | null
          requestContext?: Json | null
          source?: Json | null
          updatedAt: string
          updatedAtZ?: string | null
          validTo?: number | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          datasetId?: string
          datasetVersion?: number
          expectedTrajectory?: Json | null
          groundTruth?: Json | null
          id?: string
          input?: Json
          isDeleted?: boolean
          metadata?: Json | null
          requestContext?: Json | null
          source?: Json | null
          updatedAt?: string
          updatedAtZ?: string | null
          validTo?: number | null
        }
        Relationships: []
      }
      mastra_dataset_versions: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          datasetId: string
          id: string
          version: number
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          datasetId: string
          id: string
          version: number
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          datasetId?: string
          id?: string
          version?: number
        }
        Relationships: []
      }
      mastra_datasets: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          description: string | null
          groundTruthSchema: Json | null
          id: string
          inputSchema: Json | null
          metadata: Json | null
          name: string
          requestContextSchema: Json | null
          scorerIds: Json | null
          tags: Json | null
          targetIds: Json | null
          targetType: string | null
          updatedAt: string
          updatedAtZ: string | null
          version: number
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          groundTruthSchema?: Json | null
          id: string
          inputSchema?: Json | null
          metadata?: Json | null
          name: string
          requestContextSchema?: Json | null
          scorerIds?: Json | null
          tags?: Json | null
          targetIds?: Json | null
          targetType?: string | null
          updatedAt: string
          updatedAtZ?: string | null
          version: number
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          groundTruthSchema?: Json | null
          id?: string
          inputSchema?: Json | null
          metadata?: Json | null
          name?: string
          requestContextSchema?: Json | null
          scorerIds?: Json | null
          tags?: Json | null
          targetIds?: Json | null
          targetType?: string | null
          updatedAt?: string
          updatedAtZ?: string | null
          version?: number
        }
        Relationships: []
      }
      mastra_experiment_results: {
        Row: {
          completedAt: string
          completedAtZ: string | null
          createdAt: string
          createdAtZ: string | null
          error: Json | null
          experimentId: string
          groundTruth: Json | null
          id: string
          input: Json
          itemDatasetVersion: number | null
          itemId: string
          output: Json | null
          retryCount: number
          startedAt: string
          startedAtZ: string | null
          status: string | null
          tags: Json | null
          traceId: string | null
        }
        Insert: {
          completedAt: string
          completedAtZ?: string | null
          createdAt: string
          createdAtZ?: string | null
          error?: Json | null
          experimentId: string
          groundTruth?: Json | null
          id: string
          input: Json
          itemDatasetVersion?: number | null
          itemId: string
          output?: Json | null
          retryCount: number
          startedAt: string
          startedAtZ?: string | null
          status?: string | null
          tags?: Json | null
          traceId?: string | null
        }
        Update: {
          completedAt?: string
          completedAtZ?: string | null
          createdAt?: string
          createdAtZ?: string | null
          error?: Json | null
          experimentId?: string
          groundTruth?: Json | null
          id?: string
          input?: Json
          itemDatasetVersion?: number | null
          itemId?: string
          output?: Json | null
          retryCount?: number
          startedAt?: string
          startedAtZ?: string | null
          status?: string | null
          tags?: Json | null
          traceId?: string | null
        }
        Relationships: []
      }
      mastra_experiments: {
        Row: {
          agentVersion: string | null
          completedAt: string | null
          completedAtZ: string | null
          createdAt: string
          createdAtZ: string | null
          datasetId: string | null
          datasetVersion: number | null
          description: string | null
          failedCount: number
          id: string
          metadata: Json | null
          name: string | null
          skippedCount: number
          startedAt: string | null
          startedAtZ: string | null
          status: string
          succeededCount: number
          targetId: string
          targetType: string
          totalItems: number
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          agentVersion?: string | null
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt: string
          createdAtZ?: string | null
          datasetId?: string | null
          datasetVersion?: number | null
          description?: string | null
          failedCount: number
          id: string
          metadata?: Json | null
          name?: string | null
          skippedCount: number
          startedAt?: string | null
          startedAtZ?: string | null
          status: string
          succeededCount: number
          targetId: string
          targetType: string
          totalItems: number
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          agentVersion?: string | null
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt?: string
          createdAtZ?: string | null
          datasetId?: string | null
          datasetVersion?: number | null
          description?: string | null
          failedCount?: number
          id?: string
          metadata?: Json | null
          name?: string | null
          skippedCount?: number
          startedAt?: string | null
          startedAtZ?: string | null
          status?: string
          succeededCount?: number
          targetId?: string
          targetType?: string
          totalItems?: number
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_favorites: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          entityId: string
          entityType: string
          userId: string
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          entityId: string
          entityType: string
          userId: string
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          entityId?: string
          entityType?: string
          userId?: string
        }
        Relationships: []
      }
      mastra_mcp_client_versions: {
        Row: {
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          description: string | null
          id: string
          mcpClientId: string
          name: string
          servers: Json
          versionNumber: number
        }
        Insert: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          id: string
          mcpClientId: string
          name: string
          servers: Json
          versionNumber: number
        }
        Update: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          id?: string
          mcpClientId?: string
          name?: string
          servers?: Json
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_mcp_clients: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_mcp_server_versions: {
        Row: {
          agents: Json | null
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          description: string | null
          id: string
          instructions: string | null
          isLatest: boolean | null
          mcpServerId: string
          name: string
          packageCanonical: string | null
          releaseDate: string | null
          repository: Json | null
          tools: Json | null
          version: string
          versionNumber: number
          workflows: Json | null
        }
        Insert: {
          agents?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          id: string
          instructions?: string | null
          isLatest?: boolean | null
          mcpServerId: string
          name: string
          packageCanonical?: string | null
          releaseDate?: string | null
          repository?: Json | null
          tools?: Json | null
          version: string
          versionNumber: number
          workflows?: Json | null
        }
        Update: {
          agents?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          isLatest?: boolean | null
          mcpServerId?: string
          name?: string
          packageCanonical?: string | null
          releaseDate?: string | null
          repository?: Json | null
          tools?: Json | null
          version?: string
          versionNumber?: number
          workflows?: Json | null
        }
        Relationships: []
      }
      mastra_mcp_servers: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_messages: {
        Row: {
          content: string
          createdAt: string
          createdAtZ: string | null
          id: string
          resourceId: string | null
          role: string
          thread_id: string
          type: string
        }
        Insert: {
          content: string
          createdAt: string
          createdAtZ?: string | null
          id: string
          resourceId?: string | null
          role: string
          thread_id: string
          type: string
        }
        Update: {
          content?: string
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          resourceId?: string | null
          role?: string
          thread_id?: string
          type?: string
        }
        Relationships: []
      }
      mastra_notifications: {
        Row: {
          agentId: string | null
          archivedAt: string | null
          archivedAtZ: string | null
          attributes: Json | null
          coalescedCount: number
          coalesceKey: string | null
          createdAt: string
          createdAtZ: string | null
          dedupeKey: string | null
          deliverAt: string | null
          deliverAtZ: string | null
          deliveredAt: string | null
          deliveredAtZ: string | null
          deliveredSignalId: string | null
          deliveryAttempts: number
          deliveryReason: string | null
          discardedAt: string | null
          discardedAtZ: string | null
          dismissedAt: string | null
          dismissedAtZ: string | null
          id: string
          kind: string
          lastDeliveryAttemptAt: string | null
          lastDeliveryAttemptAtZ: string | null
          lastDeliveryError: string | null
          metadata: Json | null
          payload: Json | null
          priority: string
          resourceId: string | null
          seenAt: string | null
          seenAtZ: string | null
          source: string
          sourceId: string | null
          status: string
          summary: string
          summaryAt: string | null
          summaryAtZ: string | null
          summarySignalId: string | null
          threadId: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          agentId?: string | null
          archivedAt?: string | null
          archivedAtZ?: string | null
          attributes?: Json | null
          coalescedCount: number
          coalesceKey?: string | null
          createdAt: string
          createdAtZ?: string | null
          dedupeKey?: string | null
          deliverAt?: string | null
          deliverAtZ?: string | null
          deliveredAt?: string | null
          deliveredAtZ?: string | null
          deliveredSignalId?: string | null
          deliveryAttempts: number
          deliveryReason?: string | null
          discardedAt?: string | null
          discardedAtZ?: string | null
          dismissedAt?: string | null
          dismissedAtZ?: string | null
          id: string
          kind: string
          lastDeliveryAttemptAt?: string | null
          lastDeliveryAttemptAtZ?: string | null
          lastDeliveryError?: string | null
          metadata?: Json | null
          payload?: Json | null
          priority: string
          resourceId?: string | null
          seenAt?: string | null
          seenAtZ?: string | null
          source: string
          sourceId?: string | null
          status: string
          summary: string
          summaryAt?: string | null
          summaryAtZ?: string | null
          summarySignalId?: string | null
          threadId: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          agentId?: string | null
          archivedAt?: string | null
          archivedAtZ?: string | null
          attributes?: Json | null
          coalescedCount?: number
          coalesceKey?: string | null
          createdAt?: string
          createdAtZ?: string | null
          dedupeKey?: string | null
          deliverAt?: string | null
          deliverAtZ?: string | null
          deliveredAt?: string | null
          deliveredAtZ?: string | null
          deliveredSignalId?: string | null
          deliveryAttempts?: number
          deliveryReason?: string | null
          discardedAt?: string | null
          discardedAtZ?: string | null
          dismissedAt?: string | null
          dismissedAtZ?: string | null
          id?: string
          kind?: string
          lastDeliveryAttemptAt?: string | null
          lastDeliveryAttemptAtZ?: string | null
          lastDeliveryError?: string | null
          metadata?: Json | null
          payload?: Json | null
          priority?: string
          resourceId?: string | null
          seenAt?: string | null
          seenAtZ?: string | null
          source?: string
          sourceId?: string | null
          status?: string
          summary?: string
          summaryAt?: string | null
          summaryAtZ?: string | null
          summarySignalId?: string | null
          threadId?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_observational_memory: {
        Row: {
          activeObservations: string
          activeObservationsPendingUpdate: string | null
          bufferedMessageIds: Json | null
          bufferedObservationChunks: Json | null
          bufferedObservations: string | null
          bufferedObservationTokens: number | null
          bufferedReflection: string | null
          bufferedReflectionInputTokens: number | null
          bufferedReflectionTokens: number | null
          config: string
          createdAt: string
          createdAtZ: string | null
          generationCount: number
          id: string
          isBufferingObservation: boolean
          isBufferingReflection: boolean
          isObserving: boolean
          isReflecting: boolean
          lastBufferedAtTime: string | null
          lastBufferedAtTimeZ: string | null
          lastBufferedAtTokens: number
          lastObservedAt: string | null
          lastObservedAtZ: string | null
          lastReflectionAt: string | null
          lastReflectionAtZ: string | null
          lookupKey: string
          metadata: Json | null
          observationTokenCount: number
          observedMessageIds: Json | null
          observedTimezone: string | null
          originType: string
          pendingMessageTokens: number
          reflectedObservationLineCount: number | null
          resourceId: string | null
          scope: string
          threadId: string | null
          totalTokensObserved: number
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeObservations: string
          activeObservationsPendingUpdate?: string | null
          bufferedMessageIds?: Json | null
          bufferedObservationChunks?: Json | null
          bufferedObservations?: string | null
          bufferedObservationTokens?: number | null
          bufferedReflection?: string | null
          bufferedReflectionInputTokens?: number | null
          bufferedReflectionTokens?: number | null
          config: string
          createdAt: string
          createdAtZ?: string | null
          generationCount: number
          id: string
          isBufferingObservation: boolean
          isBufferingReflection: boolean
          isObserving: boolean
          isReflecting: boolean
          lastBufferedAtTime?: string | null
          lastBufferedAtTimeZ?: string | null
          lastBufferedAtTokens: number
          lastObservedAt?: string | null
          lastObservedAtZ?: string | null
          lastReflectionAt?: string | null
          lastReflectionAtZ?: string | null
          lookupKey: string
          metadata?: Json | null
          observationTokenCount: number
          observedMessageIds?: Json | null
          observedTimezone?: string | null
          originType: string
          pendingMessageTokens: number
          reflectedObservationLineCount?: number | null
          resourceId?: string | null
          scope: string
          threadId?: string | null
          totalTokensObserved: number
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeObservations?: string
          activeObservationsPendingUpdate?: string | null
          bufferedMessageIds?: Json | null
          bufferedObservationChunks?: Json | null
          bufferedObservations?: string | null
          bufferedObservationTokens?: number | null
          bufferedReflection?: string | null
          bufferedReflectionInputTokens?: number | null
          bufferedReflectionTokens?: number | null
          config?: string
          createdAt?: string
          createdAtZ?: string | null
          generationCount?: number
          id?: string
          isBufferingObservation?: boolean
          isBufferingReflection?: boolean
          isObserving?: boolean
          isReflecting?: boolean
          lastBufferedAtTime?: string | null
          lastBufferedAtTimeZ?: string | null
          lastBufferedAtTokens?: number
          lastObservedAt?: string | null
          lastObservedAtZ?: string | null
          lastReflectionAt?: string | null
          lastReflectionAtZ?: string | null
          lookupKey?: string
          metadata?: Json | null
          observationTokenCount?: number
          observedMessageIds?: Json | null
          observedTimezone?: string | null
          originType?: string
          pendingMessageTokens?: number
          reflectedObservationLineCount?: number | null
          resourceId?: string | null
          scope?: string
          threadId?: string | null
          totalTokensObserved?: number
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_prompt_block_versions: {
        Row: {
          blockId: string
          changedFields: Json | null
          changeMessage: string | null
          content: string
          createdAt: string
          createdAtZ: string | null
          description: string | null
          id: string
          name: string
          requestContextSchema: Json | null
          rules: Json | null
          versionNumber: number
        }
        Insert: {
          blockId: string
          changedFields?: Json | null
          changeMessage?: string | null
          content: string
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          id: string
          name: string
          requestContextSchema?: Json | null
          rules?: Json | null
          versionNumber: number
        }
        Update: {
          blockId?: string
          changedFields?: Json | null
          changeMessage?: string | null
          content?: string
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          id?: string
          name?: string
          requestContextSchema?: Json | null
          rules?: Json | null
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_prompt_blocks: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_resources: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          updatedAt: string
          updatedAtZ: string | null
          workingMemory: string | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          updatedAt: string
          updatedAtZ?: string | null
          workingMemory?: string | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          updatedAt?: string
          updatedAtZ?: string | null
          workingMemory?: string | null
        }
        Relationships: []
      }
      mastra_schedule_triggers: {
        Row: {
          actual_fire_at: number
          error: string | null
          id: string
          metadata: Json | null
          outcome: string
          parent_trigger_id: string | null
          run_id: string | null
          schedule_id: string
          scheduled_fire_at: number
          trigger_kind: string
        }
        Insert: {
          actual_fire_at: number
          error?: string | null
          id: string
          metadata?: Json | null
          outcome: string
          parent_trigger_id?: string | null
          run_id?: string | null
          schedule_id: string
          scheduled_fire_at: number
          trigger_kind: string
        }
        Update: {
          actual_fire_at?: number
          error?: string | null
          id?: string
          metadata?: Json | null
          outcome?: string
          parent_trigger_id?: string | null
          run_id?: string | null
          schedule_id?: string
          scheduled_fire_at?: number
          trigger_kind?: string
        }
        Relationships: []
      }
      mastra_schedules: {
        Row: {
          created_at: number
          cron: string
          id: string
          last_fire_at: number | null
          last_run_id: string | null
          metadata: Json | null
          next_fire_at: number
          owner_id: string | null
          owner_type: string | null
          status: string
          target: Json
          timezone: string | null
          updated_at: number
        }
        Insert: {
          created_at: number
          cron: string
          id: string
          last_fire_at?: number | null
          last_run_id?: string | null
          metadata?: Json | null
          next_fire_at: number
          owner_id?: string | null
          owner_type?: string | null
          status: string
          target: Json
          timezone?: string | null
          updated_at: number
        }
        Update: {
          created_at?: number
          cron?: string
          id?: string
          last_fire_at?: number | null
          last_run_id?: string | null
          metadata?: Json | null
          next_fire_at?: number
          owner_id?: string | null
          owner_type?: string | null
          status?: string
          target?: Json
          timezone?: string | null
          updated_at?: number
        }
        Relationships: []
      }
      mastra_scorer_definition_versions: {
        Row: {
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          defaultSampling: Json | null
          description: string | null
          id: string
          instructions: string | null
          model: Json | null
          name: string
          presetConfig: Json | null
          scoreRange: Json | null
          scorerDefinitionId: string
          type: string
          versionNumber: number
        }
        Insert: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          defaultSampling?: Json | null
          description?: string | null
          id: string
          instructions?: string | null
          model?: Json | null
          name: string
          presetConfig?: Json | null
          scoreRange?: Json | null
          scorerDefinitionId: string
          type: string
          versionNumber: number
        }
        Update: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          defaultSampling?: Json | null
          description?: string | null
          id?: string
          instructions?: string | null
          model?: Json | null
          name?: string
          presetConfig?: Json | null
          scoreRange?: Json | null
          scorerDefinitionId?: string
          type?: string
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_scorer_definitions: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_scorers: {
        Row: {
          additionalContext: Json | null
          analyzePrompt: string | null
          analyzeStepResult: Json | null
          createdAt: string
          createdAtZ: string | null
          entity: Json | null
          entityId: string | null
          entityType: string | null
          extractPrompt: string | null
          extractStepResult: Json | null
          generateReasonPrompt: string | null
          generateScorePrompt: string | null
          id: string
          input: Json
          metadata: Json | null
          output: Json
          preprocessPrompt: string | null
          preprocessStepResult: Json | null
          reason: string | null
          reasonPrompt: string | null
          requestContext: Json | null
          resourceId: string | null
          runId: string
          score: number
          scorer: Json
          scorerId: string
          source: string
          spanId: string | null
          threadId: string | null
          traceId: string | null
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          additionalContext?: Json | null
          analyzePrompt?: string | null
          analyzeStepResult?: Json | null
          createdAt: string
          createdAtZ?: string | null
          entity?: Json | null
          entityId?: string | null
          entityType?: string | null
          extractPrompt?: string | null
          extractStepResult?: Json | null
          generateReasonPrompt?: string | null
          generateScorePrompt?: string | null
          id: string
          input: Json
          metadata?: Json | null
          output: Json
          preprocessPrompt?: string | null
          preprocessStepResult?: Json | null
          reason?: string | null
          reasonPrompt?: string | null
          requestContext?: Json | null
          resourceId?: string | null
          runId: string
          score: number
          scorer: Json
          scorerId: string
          source: string
          spanId?: string | null
          threadId?: string | null
          traceId?: string | null
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          additionalContext?: Json | null
          analyzePrompt?: string | null
          analyzeStepResult?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          entity?: Json | null
          entityId?: string | null
          entityType?: string | null
          extractPrompt?: string | null
          extractStepResult?: Json | null
          generateReasonPrompt?: string | null
          generateScorePrompt?: string | null
          id?: string
          input?: Json
          metadata?: Json | null
          output?: Json
          preprocessPrompt?: string | null
          preprocessStepResult?: Json | null
          reason?: string | null
          reasonPrompt?: string | null
          requestContext?: Json | null
          resourceId?: string | null
          runId?: string
          score?: number
          scorer?: Json
          scorerId?: string
          source?: string
          spanId?: string | null
          threadId?: string | null
          traceId?: string | null
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_skill_blobs: {
        Row: {
          content: string
          createdAt: string
          createdAtZ: string | null
          hash: string
          mimeType: string | null
          size: number
        }
        Insert: {
          content: string
          createdAt: string
          createdAtZ?: string | null
          hash: string
          mimeType?: string | null
          size: number
        }
        Update: {
          content?: string
          createdAt?: string
          createdAtZ?: string | null
          hash?: string
          mimeType?: string | null
          size?: number
        }
        Relationships: []
      }
      mastra_skill_versions: {
        Row: {
          assets: Json | null
          changedFields: Json | null
          changeMessage: string | null
          compatibility: Json | null
          createdAt: string
          createdAtZ: string | null
          description: string
          files: Json | null
          id: string
          instructions: string
          license: string | null
          metadata: Json | null
          name: string
          references: Json | null
          scripts: Json | null
          skillId: string
          source: Json | null
          tree: Json | null
          versionNumber: number
        }
        Insert: {
          assets?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          compatibility?: Json | null
          createdAt: string
          createdAtZ?: string | null
          description: string
          files?: Json | null
          id: string
          instructions: string
          license?: string | null
          metadata?: Json | null
          name: string
          references?: Json | null
          scripts?: Json | null
          skillId: string
          source?: Json | null
          tree?: Json | null
          versionNumber: number
        }
        Update: {
          assets?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          compatibility?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string
          files?: Json | null
          id?: string
          instructions?: string
          license?: string | null
          metadata?: Json | null
          name?: string
          references?: Json | null
          scripts?: Json | null
          skillId?: string
          source?: Json | null
          tree?: Json | null
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_skills: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          favoriteCount: number | null
          id: string
          status: string
          updatedAt: string
          updatedAtZ: string | null
          visibility: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id: string
          status: string
          updatedAt: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id?: string
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      mastra_threads: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          resourceId: string
          title: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          resourceId: string
          title: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          resourceId?: string
          title?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_workflow_snapshot: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          resourceId: string | null
          run_id: string
          snapshot: Json
          updatedAt: string
          updatedAtZ: string | null
          workflow_name: string
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          resourceId?: string | null
          run_id: string
          snapshot: Json
          updatedAt: string
          updatedAtZ?: string | null
          workflow_name: string
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          resourceId?: string | null
          run_id?: string
          snapshot?: Json
          updatedAt?: string
          updatedAtZ?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
      mastra_workspace_versions: {
        Row: {
          autoSync: boolean | null
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          description: string | null
          filesystem: Json | null
          id: string
          mounts: Json | null
          name: string
          operationTimeout: number | null
          sandbox: Json | null
          search: Json | null
          skills: Json | null
          tools: Json | null
          versionNumber: number
          workspaceId: string
        }
        Insert: {
          autoSync?: boolean | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          filesystem?: Json | null
          id: string
          mounts?: Json | null
          name: string
          operationTimeout?: number | null
          sandbox?: Json | null
          search?: Json | null
          skills?: Json | null
          tools?: Json | null
          versionNumber: number
          workspaceId: string
        }
        Update: {
          autoSync?: boolean | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          filesystem?: Json | null
          id?: string
          mounts?: Json | null
          name?: string
          operationTimeout?: number | null
          sandbox?: Json | null
          search?: Json | null
          skills?: Json | null
          tools?: Json | null
          versionNumber?: number
          workspaceId?: string
        }
        Relationships: []
      }
      mastra_workspaces: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_slots: {
        Row: {
          created_at: string
          id: string
          meal_plan_id: string
          name: string
          scheduled_time: string | null
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          updated_at: string
          window_minutes: number
        }
        Insert: {
          created_at?: string
          id?: string
          meal_plan_id: string
          name: string
          scheduled_time?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          created_at?: string
          id?: string
          meal_plan_id?: string
          name?: string
          scheduled_time?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string
          window_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_slots_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone_number: string | null
          role: Database["public"]["Enums"]["role_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          updated_at?: string
        }
        Relationships: []
      }
      strike_log: {
        Row: {
          id: string
          issued_at: string
          profile_id: string
          reason: string
          updated_at: string
        }
        Insert: {
          id?: string
          issued_at?: string
          profile_id: string
          reason: string
          updated_at?: string
        }
        Update: {
          id?: string
          issued_at?: string
          profile_id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strike_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          renewal_notified_d28: boolean
          renewal_notified_d30: boolean
          start_date: string | null
          status: string
          tier_type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          renewal_notified_d28?: boolean
          renewal_notified_d30?: boolean
          start_date?: string | null
          status: string
          tier_type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          renewal_notified_d28?: boolean
          renewal_notified_d30?: boolean
          start_date?: string | null
          status?: string
          tier_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_clients: {
        Row: {
          client_id: string
          is_active: boolean
          linked_at: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          is_active?: boolean
          linked_at?: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          is_active?: boolean
          linked_at?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_clients_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_waba_credentials: {
        Row: {
          access_token: string | null
          business_account_id: string | null
          connected_at: string | null
          created_at: string
          id: string
          phone_number: string | null
          phone_number_id: string | null
          status: string
          trainer_id: string
          updated_at: string
          waba_id: string | null
        }
        Insert: {
          access_token?: string | null
          business_account_id?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          phone_number_id?: string | null
          status?: string
          trainer_id: string
          updated_at?: string
          waba_id?: string | null
        }
        Update: {
          access_token?: string | null
          business_account_id?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          phone_number_id?: string | null
          status?: string
          trainer_id?: string
          updated_at?: string
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_waba_credentials_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_payments: {
        Row: {
          amount: number
          billing_screenshot_url: string | null
          client_id: string
          created_at: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status_type"]
          updated_at: string
          utr_number: string
        }
        Insert: {
          amount: number
          billing_screenshot_url?: string | null
          client_id: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          updated_at?: string
          utr_number: string
        }
        Update: {
          amount?: number
          billing_screenshot_url?: string | null
          client_id?: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          updated_at?: string
          utr_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_notes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          processing_status: Database["public"]["Enums"]["processing_status_type"]
          storage_bucket_url: string
          transcript: string | null
          updated_at: string
          whatsapp_message_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          processing_status?: Database["public"]["Enums"]["processing_status_type"]
          storage_bucket_url: string
          transcript?: string | null
          updated_at?: string
          whatsapp_message_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          processing_status?: Database["public"]["Enums"]["processing_status_type"]
          storage_bucket_url?: string
          transcript?: string | null
          updated_at?: string
          whatsapp_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          client_id: string
          created_at: string
          id: string
          pdf_storage_url: string | null
          report_date: string
          summary: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          pdf_storage_url?: string | null
          report_date: string
          summary: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          pdf_storage_url?: string | null
          report_date?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pgmq_read: {
        Args: { qty: number; queue_name: string; vt: number }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "message_record"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      payment_status_type: "pending" | "verified" | "rejected"
      processing_status_type: "pending" | "processing" | "completed" | "failed"
      role_type: "trainer" | "client" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      payment_status_type: ["pending", "verified", "rejected"],
      processing_status_type: ["pending", "processing", "completed", "failed"],
      role_type: ["trainer", "client", "admin"],
    },
  },
} as const
