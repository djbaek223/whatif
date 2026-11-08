import { adsenseClient } from "@/lib/ads";

/**
 * /ads.txt: the list of who may sell this site's ad space. Google AdSense asks for the line
 * `google.com, pub-<id>, DIRECT, f08c47fec0942fa0` once the account exists. Set NEXT_PUBLIC_ADSENSE_CLIENT
 * (ca-pub-<id>) in the Vercel project's environment and redeploy; until then the file only says it is empty.
 */
export function GET() {
  const client = adsenseClient();
  const body = client ? `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n` : "# No ad sellers yet.\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
