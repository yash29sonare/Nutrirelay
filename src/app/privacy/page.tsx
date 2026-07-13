import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy | NutriRelay",
  description: "NutriRelay privacy policy for WhatsApp-based nutrition coaching workflows.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy policy"
      title="How NutriRelay handles personal data"
      description="This is a practical pre-launch privacy page for NutriRelay. It should be reviewed by a qualified legal professional before production launch."
    >
      <section>
        <h2 className="text-lg font-semibold text-white">What we collect</h2>
        <p>
          NutriRelay is a trainer-first nutrition coaching product. Trainers are the account holders, and their
          clients usually interact through WhatsApp rather than creating app accounts of their own.
        </p>
        <p className="mt-3">
          Depending on how a trainer uses the product, NutriRelay may process trainer account details, client names
          and details provided by the trainer, phone numbers or WhatsApp identifiers needed for messaging, food logs,
          check-ins, trainer notes, review actions, app usage data, browser or device data, auth or session data,
          logs, and security records.
        </p>
        <p className="mt-3">
          NutriRelay may also process health or nutrition-related information such as height, weight, goals,
          allergies, food preferences, dislikes or restrictions, workout or routine timing, check-in timing, photos,
          voice notes, transcripts, and nutrition summaries. This can be sensitive data. Trainers are responsible for
          collecting and using client data with proper consent and appropriate permissions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">How we use data</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>to let trainers manage client nutrition workflows</li>
          <li>to send and receive WhatsApp-based messages and check-ins</li>
          <li>to process food messages, photos, and voice notes into nutrition tracking records</li>
          <li>to generate summaries, progress views, and trainer review tools</li>
          <li>to support product security, troubleshooting, and abuse prevention</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">AI and automation</h2>
        <p>
          NutriRelay may use AI and automation to help process food messages, estimate nutrition, classify messages or
          photos, transcribe or process voice notes, summarize progress, and assist trainers with repetitive nutrition
          tracking work.
        </p>
        <p className="mt-3">
          AI is an assistant, not an autonomous medical, nutrition, or coaching authority. AI output can be wrong and
          should be checked. Trainers remain responsible for reviewing and using the information.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">WhatsApp and Meta</h2>
        <p>
          NutriRelay works with WhatsApp. Messages between trainers and clients may be sent or received through
          WhatsApp, and WhatsApp or Meta may process those messages under their own terms and privacy policies.
          NutriRelay is not WhatsApp or Meta.
        </p>
        <p className="mt-3">
          Message delivery depends on Meta or WhatsApp systems, policies, templates, and 24-hour messaging rules.
          Clients can ask their trainer to stop messaging them through NutriRelay or WhatsApp, and they can also
          contact support@nutrirelay.com for privacy or deletion concerns.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">How data may be shared</h2>
        <p>
          Data may be shared with service providers and infrastructure partners that help NutriRelay operate, such as
          hosting, authentication, logging, analytics, messaging, storage, and support systems. Data may also be
          shared when required for safety, fraud prevention, legal compliance, or to protect NutriRelay, trainers,
          clients, or the public.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Retention and security</h2>
        <p>
          NutriRelay keeps data only for as long as reasonably needed for active product use, support, security,
          backups, fraud prevention, dispute handling, or legal obligations. Exact retention settings may change before
          launch.
        </p>
        <p className="mt-3">
          We use reasonable technical and operational measures to protect data, but no online system can promise
          absolute security.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Health and safety notice</h2>
        <p>
          NutriRelay is not a medical device. It does not provide medical diagnosis, treatment, emergency advice, or
          emergency response. Nutrition estimates and summaries are informational only.
        </p>
        <p className="mt-3">
          Trainers and clients should consult qualified health professionals where needed. Do not use NutriRelay for
          emergencies, serious medical conditions, eating disorders, pregnancy, allergies requiring urgent care, or
          other high-risk situations without professional supervision.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Global use, minors, and rights</h2>
        <p>
          NutriRelay is based in India and may serve users globally. Data may be processed in different locations
          depending on the services used to operate the product.
        </p>
        <p className="mt-3">
          NutriRelay is not intended for children or minors without appropriate trainer, client, parent, or guardian
          consent where required. Trainers must ensure they have the right permissions before adding minors or
          processing sensitive data about them.
        </p>
        <p className="mt-3">
          Trainers and clients can raise privacy or deletion concerns by contacting support@nutrirelay.com. Clients
          may also ask their trainer to stop messages or request deletion support through their trainer.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Payments and contact</h2>
        <p>
          NutriRelay does not currently claim that paid subscriptions are live. If paid plans are introduced later,
          billing and refund terms will be provided at that time.
        </p>
        <p className="mt-3">
          Effective date: July 13, 2026. For privacy questions, email support@nutrirelay.com.
        </p>
      </section>
    </PublicInfoPage>
  );
}
