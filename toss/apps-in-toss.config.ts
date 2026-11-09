import { defineConfig } from "@apps-in-toss/web-framework/config";

// appName must match the app name registered in the 앱인토스 console. The server's CORS list (src/proxy.ts,
// TOSS_APP_NAME) uses the same name, so change both together.
export default defineConfig({
  appName: "whatif",
  permissions: [],
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: "never",
    allowsBackForwardNavigationGestures: false,
  },
  webBundleDir: "dist",
});
