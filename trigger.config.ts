import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "fortress-fitness-pro",
  runtime: "node",
  maxDuration: 300,
  build: {
    extensions: [ffmpeg()],
    external: ["fluent-ffmpeg"],
  },
});
