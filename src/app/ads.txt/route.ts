import { adsenseClient } from "@/lib/ads";

/**
 * /ads.txt: the list of who may sell this site's ad space. Google AdSense asks for the line
 * `google.com, pub-<id>, DIRECT, f08c47fec0942fa0`.
 * The id comes from adsenseClient() (src/lib/ads.ts).
 */
export function GET() {
  const client = adsenseClient();
  const body = client ? `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n` : "# No ad sellers yet.\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
