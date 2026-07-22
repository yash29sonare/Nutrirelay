export const dynamic = "force-dynamic";

const MESSAGE = "Meta Embedded Signup callback is not enabled yet.";

function buildNotEnabledResponse(): Response {
  return Response.json(
    {
      ok: false,
      error: "EMBEDDED_SIGNUP_NOT_ENABLED",
      message: MESSAGE,
    },
    {
      status: 501,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(): Promise<Response> {
  return buildNotEnabledResponse();
}

export async function POST(): Promise<Response> {
  return buildNotEnabledResponse();
}
