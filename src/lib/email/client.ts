/**
 * Mailgun email client using REST API.
 * Requires: MAILGUN_API_KEY, MAILGUN_DOMAIN
 */

const MAILGUN_BASE_URL = process.env.MAILGUN_BASE_URL || "https://api.mailgun.net";

export const FROM_EMAIL =
  process.env.ALERT_FROM_EMAIL ||
  `SISEM <postmaster@${process.env.MAILGUN_DOMAIN || "example.com"}>`;

export async function sendEmail({
  from,
  to,
  subject,
  html,
}: {
  from?: string;
  to: string[];
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    console.error("MAILGUN_API_KEY or MAILGUN_DOMAIN not configured");
    return { error: "Email no configurado" };
  }

  const formData = new FormData();
  formData.append("from", from || FROM_EMAIL);
  for (const recipient of to) {
    formData.append("to", recipient);
  }
  formData.append("subject", subject);
  formData.append("html", html);

  try {
    const res = await fetch(`${MAILGUN_BASE_URL}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Mailgun error:", res.status, body);
      return { error: `Mailgun ${res.status}: ${body}` };
    }

    return { error: null };
  } catch (err) {
    console.error("Mailgun send error:", err);
    return { error: err instanceof Error ? err.message : "Error enviando email" };
  }
}
