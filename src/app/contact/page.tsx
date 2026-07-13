import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export const metadata: Metadata = {
  title: "Contact | NutriRelay",
  description: "Public support and contact information for NutriRelay.",
};

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="NutriRelay support"
      description="Pre-launch public contact details for NutriRelay. Please review and replace placeholders before production launch if needed."
    >
      <section>
        <h2 className="text-lg font-semibold text-white">Support</h2>
        <p>
          General support: support@nutrirelay.com
        </p>
        <p className="mt-3">
          Use this address for general product questions, account help, and pre-launch support requests.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Privacy and data deletion</h2>
        <p>
          For privacy concerns, deletion requests, or requests to stop WhatsApp messaging, email
          {" "}support@nutrirelay.com.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Trainers interested in NutriRelay</h2>
        <p>
          Coaches or nutrition trainers who want to learn more about NutriRelay can use support@nutrirelay.com as the
          current contact point.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Abuse and safety reports</h2>
        <p>
          If you believe NutriRelay is being used for harassment, spam, unsafe dieting, non-consensual messaging, or
          other harmful behavior, report it at support@nutrirelay.com.
        </p>
        <p className="mt-3">
          NutriRelay does not list a public phone number, street address, or company registration number on this
          pre-launch page because those details have not been finalized yet.
        </p>
      </section>
    </PublicInfoPage>
  );
}
