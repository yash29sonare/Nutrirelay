import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/utils/supabase/server";
import { getWhatsAppDevConsoleData } from "@/lib/whatsapp/dev-console";
import { WhatsAppDevConsole } from "./WhatsAppDevConsole";

export const dynamic = "force-dynamic";

export default async function WhatsAppDevPage({
  searchParams,
}: {
  searchParams: Promise<{ trainer_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sp = await searchParams;

  const authUserId = user?.id ?? null;
  const trainerIdOverride =
    !authUserId && process.env.NODE_ENV !== "production"
      ? sp.trainer_id?.trim() ?? null
      : null;

  const initialData = authUserId || trainerIdOverride
    ? await getWhatsAppDevConsoleData(authUserId ?? trainerIdOverride!)
    : {
      readiness: {
        hasVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
        hasAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        credentialRow: null,
      },
      clients: [],
      clientSummaries: [],
      lastInbound: null,
      lastOutbound: null,
      lastWebhookEvent: null,
      lastStatus: null,
    };

  return (
    <PageContainer>
      <PageHeader
        title="WhatsApp Dev"
        description="Manual Meta development-mode verification console."
      />
      <WhatsAppDevConsole initialData={initialData} />
    </PageContainer>
  );
}
