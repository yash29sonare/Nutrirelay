import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardSection } from "@/components/layout/DashboardSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkspaceDashboard } from "./WorkspaceDashboard";
import { getDashboardData } from "@/lib/operations/dashboard";
import { generateDashboardInsights } from "@/lib/insights/dashboardInsights";
import { generateActionQueue } from "@/lib/engagement/engagementEngine";
import { buildEngagementState, filterByProjection } from "@/lib/engagement/engagementProjection";
import { getTrainerDailyFeed } from "@/lib/engagement/getTrainerDailyFeed";
import { getEvents, appendEvents } from "@/lib/events/engagementEventStore";
import { getActionKey } from "@/lib/engagement/actionKey";
import { computeOutcomeFromEvents } from "@/lib/outcomes/eventOutcomeEngine";
import { generateInsightsFromEvents } from "@/lib/ai/engagementAI";
import { getTrainerClientSummaries } from "@/lib/dashboard-reads";
import { getTrainerReportsCenterData } from "@/lib/reports/report-center";

function EmptyRoster({ message }: { message: string }) {
  return (
    <PageContainer>
      <PageHeader
        title="Command Center"
        description="Live client roster and tracking overview."
      />
      <DashboardSection title="Client roster">
        <EmptyState title={message} />
      </DashboardSection>
    </PageContainer>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authUserId = user?.id ?? null;

  if (!authUserId) {
    return <EmptyRoster message="Sign in to view your client roster." />;
  }

  const result = await getDashboardData(authUserId);

  if (!result.success) {
    switch (result.error.code) {
      case "TRAINER_NOT_FOUND":
        return (
          <EmptyRoster message="Your trainer profile is being set up. Complete onboarding to get started." />
        );
      case "TEMPORARY_DB_FAILURE":
        return (
          <EmptyRoster message="The dashboard is temporarily unavailable. Please try again." />
        );
      case "PERMANENT_DB_ERROR":
        return (
          <EmptyRoster message="Something went wrong loading your dashboard. Contact support if this persists." />
        );
      default:
        return (
          <EmptyRoster message="Something went wrong. Please try again." />
        );
    }
  }

  // ── Success path — DashboardDataDTO guaranteed ────────────────
  const dto = result.data;
  const insights = generateDashboardInsights(dto);

  // ── Engagement event pipeline ─────────────────────────────────
  const [events, clientSummaries, reportsCenter] = await Promise.all([
    getEvents(authUserId),
    getTrainerClientSummaries(authUserId).catch(() => []),
    getTrainerReportsCenterData(authUserId).catch(() => null),
  ]);
  const projection = buildEngagementState(events);
  const runtimeActions = generateActionQueue(dto, insights);
  const filtered = filterByProjection(runtimeActions, projection, authUserId);

  // Append ACTION_CREATED events for new actions
  const newActions = filtered.filter((a) => a.id.startsWith("action-"));
  if (newActions.length > 0) {
    const eventInputs = newActions.map((a) => ({
      client_id: a.clientId || null,
      action_id: null,
      event_type: "ACTION_CREATED" as const,
      event_id: `created:${getActionKey(authUserId, a.clientId, a.type, a.reason)}`,
      payload: {
        actionKey: getActionKey(authUserId, a.clientId, a.type, a.reason),
        type: a.type,
        reason: a.reason,
        priority: a.priority,
        confidence: a.confidence,
      },
    }));
    await appendEvents(authUserId, eventInputs);
  }

  getTrainerDailyFeed(filtered);
  computeOutcomeFromEvents(events);
  generateInsightsFromEvents(events);

  const userName = (user?.user_metadata?.display_name as string) ?? null;
  const reportsReady = reportsCenter
    ? reportsCenter.weeklyReports.filter((report) => report.status !== "no_data").length
    : null;

  return (
    <PageContainer>
      <WorkspaceDashboard
        data={dto}
        clientSummaries={clientSummaries}
        reportsReady={reportsReady}
        userName={userName}
      />
    </PageContainer>
  );
}
