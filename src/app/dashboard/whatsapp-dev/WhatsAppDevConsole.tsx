"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Input } from "@/components/ui/Input";
import type { WhatsAppDevConsoleData } from "@/lib/whatsapp/dev-console";

interface WhatsAppDevConsoleProps {
  initialData: WhatsAppDevConsoleData;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

export function WhatsAppDevConsole({ initialData }: WhatsAppDevConsoleProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initialData.clients[0]?.clientId ?? "");
  const [messageText, setMessageText] = useState("NutriRelay Meta dev test message");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = initialData.clients.find((client) => client.clientId === clientId) ?? null;
  const hasConnectedCredentials = initialData.readiness.credentialRow?.status === "connected";

  async function sendTestMessage(sendMode: "freeform" | "template") {
    setFeedback(null);
    setError(null);

    if (!clientId) {
      setError("Choose a client.");
      return;
    }

    if (sendMode === "freeform" && !messageText.trim()) {
      setError("Choose a client and enter a message.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/whatsapp/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          message_text: messageText.trim(),
          send_mode: sendMode,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to send test message.");
      }

      const messageLabel = sendMode === "template" ? "template test message" : "test message";
      setFeedback(`Sent ${messageLabel}${json.wam_id ? ` (${json.wam_id})` : ""}.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send test message.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendTestMessage("freeform");
  }

  return (
    <div className="space-y-6">
      {error ? <InlineNotice variant="error">{error}</InlineNotice> : null}
      {feedback ? <InlineNotice variant="success">{feedback}</InlineNotice> : null}

      <Card>
        <CardHeader>
          <CardTitle>Connection readiness</CardTitle>
          <CardDescription>Real trainer-scoped WhatsApp readiness only. No mock state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[var(--surface-border)] p-3">
              <p className="text-xs text-[var(--muted)]">Verify token</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {initialData.readiness.hasVerifyToken ? "Present" : "Missing"}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--surface-border)] p-3">
              <p className="text-xs text-[var(--muted)]">App secret</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {initialData.readiness.hasAppSecret ? "Present" : "Missing"}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--surface-border)] p-3">
              <p className="text-xs text-[var(--muted)]">Supabase URL</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {initialData.readiness.hasSupabaseUrl ? "Present" : "Missing"}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--surface-border)] p-3">
              <p className="text-xs text-[var(--muted)]">Service role key</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {initialData.readiness.hasServiceRoleKey ? "Present" : "Missing"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--surface-border)] p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">Trainer WABA credentials</p>
              <Badge variant={hasConnectedCredentials ? "success" : "warning"}>
                {initialData.readiness.credentialRow?.status ?? "Missing"}
              </Badge>
            </div>
            {initialData.readiness.credentialRow ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <p className="text-xs text-[var(--muted)]">
                  Phone number ID: <span className="text-[var(--foreground)]">{initialData.readiness.credentialRow.phone_number_id}</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  WABA ID: <span className="text-[var(--foreground)]">{initialData.readiness.credentialRow.waba_id ?? "Not set"}</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Business account ID: <span className="text-[var(--foreground)]">{initialData.readiness.credentialRow.business_account_id ?? "Not set"}</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Phone number: <span className="text-[var(--foreground)]">{initialData.readiness.credentialRow.phone_number ?? "Not set"}</span>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted)]">
                No `trainer_waba_credentials` row exists for this trainer.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client operational state</CardTitle>
          <CardDescription>Trainer-visible inbound, media, voice, structured response, and pause state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialData.clientSummaries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No active clients available for operational QA yet.</p>
          ) : (
            initialData.clientSummaries.map((client) => (
              <div key={client.clientId} className="rounded-lg border border-[var(--surface-border)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{client.label}</p>
                    <p className="text-xs text-[var(--muted)]">{client.phoneNumber ?? "No phone number"}</p>
                  </div>
                  <Badge variant={client.automationState === "paused_no_response" ? "warning" : client.automationState === "resumed_on_inbound" ? "info" : "success"}>
                    {client.automationState}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] md:grid-cols-2">
                  <p>Latest inbound: <span className="text-[var(--foreground)]">{client.latestInbound ?? "Not available"}</span></p>
                  <p>Latest media: <span className="text-[var(--foreground)]">{client.latestMedia ?? "Not available"}</span></p>
                  <p>Latest voice note: <span className="text-[var(--foreground)]">{client.latestVoiceNote ?? "Not available"}</span></p>
                  <p>Latest structured response: <span className="text-[var(--foreground)]">{client.latestStructuredResponse ?? "Not available"}</span></p>
                  <p>Latest diet log: <span className="text-[var(--foreground)]">{client.latestDietLog ?? "Not available"}</span></p>
                  <p>Latest failure: <span className="text-[var(--foreground)]">{client.latestFailure ?? "None"}</span></p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send test message</CardTitle>
          <CardDescription>Uses the active trainer-scoped outbound sender. Free-form sends require an open 24-hour window.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="clientId" className="text-sm font-medium text-[var(--foreground)]">Client</label>
              <select
                id="clientId"
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--foreground)]"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={pending || initialData.clients.length === 0}
              >
                {initialData.clients.length === 0 ? (
                  <option value="">No active clients with phone numbers</option>
                ) : (
                  initialData.clients.map((client) => (
                    <option key={client.clientId} value={client.clientId}>
                      {client.label}{client.phoneNumber ? ` (${client.phoneNumber})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <Input
              label="Message"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              disabled={pending}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--muted)]">
                Target: {selectedClient?.phoneNumber ?? "Not selected"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  loading={false}
                  disabled={pending || !hasConnectedCredentials || initialData.clients.length === 0}
                  onClick={() => {
                    void sendTestMessage("template");
                  }}
                >
                  Send template test
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  loading={pending}
                  disabled={!hasConnectedCredentials || initialData.clients.length === 0}
                >
                  Send test message
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Last inbound message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-[var(--muted)]">
            {initialData.lastInbound ? (
              <>
                <p>Received: <span className="text-[var(--foreground)]">{formatDateTime(initialData.lastInbound.receivedAt)}</span></p>
                <p>Type: <span className="text-[var(--foreground)]">{initialData.lastInbound.eventType}</span></p>
                <p>WAM ID: <span className="text-[var(--foreground)] break-all">{initialData.lastInbound.wamId ?? "Not available"}</span></p>
                <p>Client phone: <span className="text-[var(--foreground)]">{initialData.lastInbound.clientPhone ?? "Not available"}</span></p>
                <p>Summary: <span className="text-[var(--foreground)]">{initialData.lastInbound.summary}</span></p>
              </>
            ) : (
              <p>No inbound message logged for this trainer yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last outbound message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-[var(--muted)]">
            {initialData.lastOutbound ? (
              <>
                <p>Sent: <span className="text-[var(--foreground)]">{formatDateTime(initialData.lastOutbound.sentAt)}</span></p>
                <p>Type: <span className="text-[var(--foreground)]">{initialData.lastOutbound.messageType}</span></p>
                <p>Status: <span className="text-[var(--foreground)]">{initialData.lastOutbound.deliveryStatus ?? "Not available"}</span></p>
                <p>WAM ID: <span className="text-[var(--foreground)] break-all">{initialData.lastOutbound.wamId ?? "Not available"}</span></p>
                <p>Metadata: <span className="text-[var(--foreground)] break-all">{initialData.lastOutbound.summary}</span></p>
              </>
            ) : (
              <p>No outbound message logged for this trainer yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last webhook event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-[var(--muted)]">
            {initialData.lastWebhookEvent ? (
              <>
                <p>Received: <span className="text-[var(--foreground)]">{formatDateTime(initialData.lastWebhookEvent.receivedAt)}</span></p>
                <p>Type: <span className="text-[var(--foreground)]">{initialData.lastWebhookEvent.eventType}</span></p>
                <p>WAM ID: <span className="text-[var(--foreground)] break-all">{initialData.lastWebhookEvent.wamId ?? "Not available"}</span></p>
                <p>Client phone: <span className="text-[var(--foreground)]">{initialData.lastWebhookEvent.clientPhone ?? "Not available"}</span></p>
                <p>Summary: <span className="text-[var(--foreground)]">{initialData.lastWebhookEvent.summary}</span></p>
              </>
            ) : (
              <p>No webhook event persisted for this trainer yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last status update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-[var(--muted)]">
            {initialData.lastStatus ? (
              <>
                <p>Received: <span className="text-[var(--foreground)]">{formatDateTime(initialData.lastStatus.receivedAt)}</span></p>
                <p>Status: <span className="text-[var(--foreground)]">{initialData.lastStatus.status}</span></p>
                <p>WAM ID: <span className="text-[var(--foreground)] break-all">{initialData.lastStatus.wamId}</span></p>
                <p>Recipient: <span className="text-[var(--foreground)]">{initialData.lastStatus.recipientId ?? "Not available"}</span></p>
              </>
            ) : (
              <p>No status updates persisted for this trainer yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
