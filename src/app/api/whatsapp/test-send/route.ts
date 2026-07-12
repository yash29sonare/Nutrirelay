import { NextRequest, NextResponse } from "next/server";
import { requireTrainerContext, unauthorized } from "@/lib/api-auth";
import {
  sendFreeMessage,
  sendInteractiveListMessage,
  sendTemplateMessage,
  WhatsAppDeliveryError,
  WindowClosedError,
} from "@/lib/whatsapp/send";
import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db";

export const dynamic = "force-dynamic";

interface TestSendBody {
  client_id?: string;
  message_text?: string;
  send_mode?: "freeform" | "template" | "interactive_list";
  trainer_id?: string;
}

const INTERACTIVE_LIST_PAYLOAD = {
  prompt: "Which dinner option did you follow today?",
  buttonText: "Choose option",
  sectionTitle: "Dinner adherence",
  options: [
    { id: "dinner_roti_sabzi", title: "Roti + sabzi" },
    { id: "dinner_rice_dal", title: "Rice + dal" },
    { id: "dinner_paneer_meal", title: "Paneer meal" },
    { id: "dinner_skipped", title: "Skipped dinner" },
    { id: "dinner_ate_outside", title: "Ate outside" },
  ],
} as const;

async function resolveTrainerForDevOverride(trainerId: string | undefined) {
  if (process.env.NODE_ENV === "production" || !trainerId?.trim()) {
    return null;
  }

  const db = getWhatsAppServiceDb();
  const authUserId = trainerId.trim();
  const { data: trainerProfile } = await db
    .from("trainers")
    .select("trainer_id")
    .eq("auth_user_id", authUserId)
    .limit(1)
    .maybeSingle();

  if (!trainerProfile?.trainer_id) {
    throw new Error("Trainer profile not found");
  }

  return {
    authUserId,
    trainerId: trainerProfile.trainer_id,
  };
}

export async function POST(req: NextRequest) {
  let body: TestSendBody;

  try {
    body = (await req.json()) as TestSendBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = body.client_id?.trim();
  const messageText = body.message_text?.trim();
  const sendMode =
    body.send_mode === "template"
      ? "template"
      : body.send_mode === "interactive_list"
        ? "interactive_list"
        : "freeform";

  if (!clientId || (sendMode === "freeform" && !messageText)) {
    return NextResponse.json(
      { ok: false, error: sendMode === "template" ? "client_id is required." : "client_id and message_text are required." },
      { status: 400 },
    );
  }

  try {
    const trainer =
      await resolveTrainerForDevOverride(body.trainer_id)
      ?? await requireTrainerContext();
    const db = getWhatsAppServiceDb();

    const { data: trainerClient } = await db
      .from("trainer_clients")
      .select("client_id")
      .eq("trainer_id", trainer.authUserId)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!trainerClient) {
      return NextResponse.json(
        { ok: false, error: "Client is not active for the current trainer." },
        { status: 404 },
      );
    }

    const { data: profile } = await db
      .from("profiles")
      .select("phone_number, full_name")
      .eq("id", clientId)
      .limit(1)
      .maybeSingle();

    const clientPhone = normalizeWhatsAppPhone(profile?.phone_number ?? null);
    if (!clientPhone) {
      return NextResponse.json(
        { ok: false, error: "Client does not have a WhatsApp phone number on profile." },
        { status: 400 },
      );
    }

    const result = sendMode === "template"
      ? await sendTemplateMessage(trainer.authUserId, clientPhone, "hello_world", [])
      : sendMode === "interactive_list"
        ? await sendInteractiveListMessage({
          trainerId: trainer.authUserId,
          clientPhone,
          prompt: INTERACTIVE_LIST_PAYLOAD.prompt,
          buttonText: INTERACTIVE_LIST_PAYLOAD.buttonText,
          sectionTitle: INTERACTIVE_LIST_PAYLOAD.sectionTitle,
          options: [...INTERACTIVE_LIST_PAYLOAD.options],
        })
        : await sendFreeMessage(trainer.authUserId, clientPhone, messageText!);

    return NextResponse.json({
      ok: true,
      wam_id: result.wamId,
      client_id: clientId,
      client_name: profile?.full_name ?? null,
      client_phone: clientPhone,
      delivery_status: "sent",
      send_mode: sendMode,
      interactive_payload: sendMode === "interactive_list" ? INTERACTIVE_LIST_PAYLOAD : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized — no active session") {
      return unauthorized();
    }

    if (error instanceof WindowClosedError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: "WINDOW_CLOSED",
        },
        { status: 409 },
      );
    }

    if (error instanceof WhatsAppDeliveryError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: "META_DELIVERY_ERROR",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
