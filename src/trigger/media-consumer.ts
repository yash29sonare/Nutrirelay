import { task } from "@trigger.dev/sdk";
import fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { getMastra } from "@/mastra/index";
import { getTrainerWaba } from "@/lib/waba/getTrainerWaba";

export const mediaConsumerTask = task({
  id: "media-consumer",
  maxDuration: 300,
  run: async (payload: {
    wamid:     string;
    mediaId:   string;
    mimeType:  string;
    clientId:  string;
    senderId:  string;
    trainerId: string;
  }) => {
    const { wamid, mediaId, mimeType, clientId, senderId, trainerId } = payload;

    const { accessToken: token } = await getTrainerWaba(trainerId);

    const tmpPath = path.join("/tmp", `${wamid}.ogg`);
    let writeStream: fs.WriteStream | null = null;

    try {
      // ── 1. Resolve transient Meta CDN URL ──────────────────────────────────
      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/${mediaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!metaRes.ok) throw new Error(`Meta media lookup failed: ${metaRes.status}`);
      const { url: cdnUrl } = (await metaRes.json()) as { url: string };

      // ── 2. Stream binary to /tmp ───────────────────────────────────────────
      const audioRes = await fetch(cdnUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!audioRes.ok || !audioRes.body) {
        throw new Error(`Meta CDN fetch failed: ${audioRes.status}`);
      }

      writeStream = fs.createWriteStream(tmpPath);
      await pipeline(Readable.fromWeb(audioRes.body as Parameters<typeof Readable.fromWeb>[0]), writeStream);

      // ── 3. Dispatch Mastra voiceNoteRecoveryWorkflow ───────────────────────
      const mastra = await getMastra();
      const workflow = (mastra as { getWorkflow: (id: string) => { createRun: () => Promise<{ start: (opts: unknown) => Promise<void> }> } }).getWorkflow("voiceNoteRecoveryWorkflow");
      const run = await workflow.createRun();
      await run.start({
        inputData: {
          mediaId,
          whatsappMessageId: wamid,
          userContext: { clientId, senderId, trainerId, tmpPath },
        },
      });

      return { success: true, wamid };
    } catch (err) {
      console.error("[media-consumer] failed for wamid", wamid, (err as Error).message);
      throw err;
    } finally {
      // ── 4. Guarded disk cleanup ────────────────────────────────────────────
      if (writeStream) {
        writeStream.destroy();
      }
      try {
        if (fs.existsSync(tmpPath)) {
          await fs.promises.unlink(tmpPath);
        }
      } catch (cleanupErr) {
        console.error("[media-consumer] cleanup failed for", tmpPath, (cleanupErr as Error).message);
      }
    }
  },
});
