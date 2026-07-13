import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export const metadata: Metadata = {
  title: "Terms of Service | NutriRelay",
  description: "NutriRelay terms of service for trainer-led nutrition coaching operations.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms of service"
      title="NutriRelay terms"
      description="These are practical pre-launch terms for NutriRelay and should be reviewed by a qualified legal professional before production launch."
    >
      <section>
        <h2 className="text-lg font-semibold text-white">What NutriRelay is</h2>
        <p>
          NutriRelay is a trainer-first nutrition coaching platform. It helps trainers manage food logging,
          WhatsApp-based client communication, nutrition follow-ups, progress summaries, and related coaching
          operations.
        </p>
        <p className="mt-3">
          Trainers are the primary account holders. Clients may interact through WhatsApp and do not necessarily create
          separate app accounts.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Trainer responsibility and consent</h2>
        <p>
          Trainers are responsible for their account activity, the data they add, the messages they initiate, and how
          they use NutriRelay with clients.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>get client consent before adding them to NutriRelay</li>
          <li>get consent before messaging them through WhatsApp</li>
          <li>ensure they have permission to process health or nutrition-related client data</li>
          <li>respect requests to stop messages or delete data</li>
          <li>ensure appropriate permissions before adding minors or sensitive client data</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">WhatsApp and AI limitations</h2>
        <p>
          NutriRelay works with WhatsApp, but NutriRelay is not WhatsApp or Meta. Message delivery depends on
          WhatsApp or Meta systems, templates, policies, and 24-hour messaging rules.
        </p>
        <p className="mt-3">
          NutriRelay may use AI and automation to process food messages, estimate nutrition, classify photos, process
          voice notes, summarize progress, and reduce repetitive admin work. AI can be wrong. Trainers remain
          responsible for reviewing and using the output.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Health and emergency disclaimer</h2>
        <p>
          NutriRelay is not a medical device. It does not provide medical diagnosis, treatment, emergency advice, or
          emergency response. Nutrition estimates, summaries, and suggestions are informational only.
        </p>
        <p className="mt-3">
          Do not use NutriRelay for emergencies, serious medical conditions, eating disorders, pregnancy, allergies
          requiring urgent care, or other high-risk situations without professional supervision.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Acceptable use and abuse rules</h2>
        <p>You must not use NutriRelay to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>harass, threaten, spam, manipulate, or impersonate others</li>
          <li>collect or process data without proper consent</li>
          <li>message people who did not agree to be contacted</li>
          <li>provide medical treatment, diagnosis, or emergency advice through the service</li>
          <li>promote unsafe dieting, starvation, eating-disorder behavior, self-harm, or extreme weight-loss practices</li>
          <li>upload illegal, explicit, exploitative, hateful, or harmful content</li>
          <li>abuse automation, AI features, bots, or the WhatsApp integration</li>
          <li>attempt to bypass WhatsApp or Meta rules and policies</li>
          <li>reverse engineer, attack, scrape, overload, or misuse the service</li>
          <li>use NutriRelay for fraud, scams, or unlawful business activity</li>
        </ul>
        <p className="mt-3">
          NutriRelay may suspend or terminate access for abuse, safety concerns, unlawful use, policy violations, or
          behavior that puts clients, trainers, or the product at risk.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Availability, payments, and liability</h2>
        <p>
          NutriRelay is offered on an evolving pre-launch basis. We do not guarantee uninterrupted availability,
          delivery, or error-free operation.
        </p>
        <p className="mt-3">
          Paid subscriptions are not live yet. If paid plans are introduced later, pricing, billing, refunds, and
          cancellation terms will be provided when those plans are enabled.
        </p>
        <p className="mt-3">
          NutriRelay and its content, branding, and software remain protected by applicable intellectual property law.
          To the extent allowed by law, NutriRelay is provided on an as-available basis and should not be relied on as
          a sole source of medical, legal, emergency, or business-critical decision-making.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Minors and contact</h2>
        <p>
          NutriRelay is not intended to be used by children or minors without appropriate trainer, client, parent, or
          guardian consent where required. Trainers must ensure they have the right permissions before adding minors or
          processing sensitive data about them.
        </p>
        <p className="mt-3">
          Questions about these terms can be sent to support@nutrirelay.com.
        </p>
      </section>
    </PublicInfoPage>
  );
}
