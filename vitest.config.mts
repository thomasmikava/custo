import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    server: {
      deps: {
        // These packages ship extensionless ESM imports as .js files.
        inline: [
          "react-flexible-contexts",
          "react-context-subscribers",
          "simple-subscriptions",
        ],
      },
    },
  },
});
