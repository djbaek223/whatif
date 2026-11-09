import { GOOGLE_TAG_ID } from "@/lib/analytics";

/**
 * The Google tag, as Google asks for it: first thing inside <head>, once per page. The root layout renders it, so
 * every route (Korean and /en) gets it from the server-rendered HTML.
 */
export function GoogleTag() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());",
        }}
      />
    </>
  );
}
