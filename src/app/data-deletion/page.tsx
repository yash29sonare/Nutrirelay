import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export const metadata: Metadata = {
  title: "Data Deletion | NutriRelay",
  description: "NutriRelay data deletion instructions for trainer and client records.",
};

export default function DataDeletionPage() {
  return (
    <PublicInfoPage
      eyebrow="Data deletion"
      title="Request deletion of NutriRelay data"
      description="This is the pre-launch deletion request path for NutriRelay. We may need to verify identity or authority before deleting data."
    >
      <section>
        <h2 className="text-lg font-semibold text-white">How to request deletion</h2>
        <p>
          Email support@nutrirelay.com with your deletion request. Trainers can request deletion of their own account
          data or client-related data they are authorized to manage. Clients can ask their trainer directly or contact
          NutriRelay for privacy or deletion concerns.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">What to include in the email</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>your name</li>
          <li>whether you are the trainer, the client, or an authorized representative</li>
          <li>trainer and client relationship, if relevant</li>
          <li>WhatsApp number or contact identifier, if relevant</li>
          <li>account email, if applicable</li>
          <li>what data you want deleted</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Verification and timing</h2>
        <p>
          We may ask for additional information to verify identity, authority, or the scope of the request before
          acting on it. We will respond as soon as reasonably possible.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">What deletion may and may not cover</h2>
        <p>
          A request may include trainer account details, client records, WhatsApp-related contact identifiers, food
          logs, notes, photos, voice-note transcripts, and related operational records held by NutriRelay.
        </p>
        <p className="mt-3">
          Deleting data from NutriRelay does not automatically delete data held by WhatsApp, Meta, or another
          trainer&apos;s independent records.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Stop messages and retention exceptions</h2>
        <p>
          Clients can ask their trainer to stop messaging them through NutriRelay or WhatsApp. Clients can also
          contact support@nutrirelay.com for privacy or deletion concerns.
        </p>
        <p className="mt-3">
          Some data may still be retained where reasonably required for security, fraud prevention, legal obligations,
          backups, dispute resolution, or other legitimate business reasons.
        </p>
      </section>
    </PublicInfoPage>
  );
}
