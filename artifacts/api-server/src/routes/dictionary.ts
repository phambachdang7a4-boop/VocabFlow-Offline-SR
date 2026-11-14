import { Router, type IRouter } from "express";
import { DownloadDictionaryAsset503Response } from "@workspace/api-zod";
import {
  findAudioDictionaryAsset,
  findDictionaryAsset,
  findUkIpaAsset,
} from "../lib/dictionary-storage";

const router: IRouter = Router();

// Public reference data only. No user vocabulary is ever sent to this server.
router.get("/dictionary/asset", async (req, res): Promise<void> => {
  try {
    const file = await findDictionaryAsset();
    const [metadata] = await file.getMetadata();
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Length": String(metadata.size),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'attachment; filename="dictionary_en_vi.db"',
    });
    const stream = file.createReadStream();
    res.on("close", () => {
      if (!res.writableEnded) stream.destroy();
    });
    stream.on("error", (error) => {
      req.log.error({ err: error }, "Dictionary asset stream failed");
      if (res.headersSent) res.destroy(error);
      else {
        res.removeHeader("Content-Length");
        res.removeHeader("Content-Disposition");
        res.removeHeader("Cache-Control");
        res.status(503).json(
          DownloadDictionaryAsset503Response.parse({
            error: "Kho từ điển tạm thời chưa tải được. Hãy thử lại.",
          }),
        );
      }
    });
    stream.pipe(res);
  } catch (error) {
    req.log.error({ err: error }, "Cannot serve the public dictionary asset");
    res.status(503).json(
      DownloadDictionaryAsset503Response.parse({
        error: "Kho từ điển tạm thời chưa tải được. Hãy thử lại.",
      }),
    );
  }
});

router.get("/dictionary/audio", async (req, res): Promise<void> => {
  try {
    const file = await findAudioDictionaryAsset();
    const [metadata] = await file.getMetadata();
    const totalBytes = Number(metadata.size);
    const rangeHeader = req.header("range");
    let start = 0;
    let end = totalBytes - 1;
    let status = 200;

    if (rangeHeader) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim());
      if (!match) {
        res.set("Content-Range", `bytes */${totalBytes}`);
        res.set("Accept-Ranges", "bytes").sendStatus(416);
        return;
      }
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : totalBytes - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start >= totalBytes ||
        end < start
      ) {
        res.set("Content-Range", `bytes */${totalBytes}`);
        res.set("Accept-Ranges", "bytes").sendStatus(416);
        return;
      }
      end = Math.min(end, totalBytes - 1);
      status = 206;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Length": String(end - start + 1),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition":
        'attachment; filename="vocabflow-audio-dictionary.db"',
      "Accept-Ranges": "bytes",
      "X-Audio-Dictionary-SHA256":
        "b3821cbbe15ee0e42dad72867a14202adbcefae2ed1e1712e24fcc9c389f4acc",
      "X-Audio-Dictionary-Entries": "104829",
    };
    if (status === 206)
      headers["Content-Range"] = `bytes ${start}-${end}/${totalBytes}`;
    res.status(status).set(headers);

    const stream = file.createReadStream(
      status === 206 ? { start, end } : undefined,
    );
    res.on("close", () => {
      if (!res.writableEnded) stream.destroy();
    });
    stream.on("error", (error) => {
      req.log.error({ err: error }, "Offline audio asset stream failed");
      if (res.headersSent) res.destroy(error);
      else {
        res.removeHeader("Content-Length");
        res.removeHeader("Content-Disposition");
        res.removeHeader("Cache-Control");
        res.status(503).json({
          error: "Gói âm thanh offline tạm thời chưa tải được. Hãy thử lại.",
        });
      }
    });
    stream.pipe(res);
  } catch (error) {
    req.log.error({ err: error }, "Cannot serve the offline audio asset");
    res.status(503).json({
      error: "Gói âm thanh offline tạm thời chưa tải được. Hãy thử lại.",
    });
  }
});

router.get("/dictionary/ipa-uk", async (req, res): Promise<void> => {
  try {
    const file = await findUkIpaAsset();
    const [metadata] = await file.getMetadata();
    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": String(metadata.size),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'attachment; filename="dictionary_en_uk_slim.tsv"',
      "X-UK-IPA-SHA256":
        "b3ae7040c0a2c7a479a93cd8be2cb0ae5c8d7dd58f84d54ad4d212d9983c9d9c",
    });
    const stream = file.createReadStream();
    res.on("close", () => {
      if (!res.writableEnded) stream.destroy();
    });
    stream.on("error", (error) => {
      req.log.error({ err: error }, "UK IPA asset stream failed");
      if (res.headersSent) res.destroy(error);
      else {
        res.removeHeader("Content-Length");
        res.removeHeader("Content-Disposition");
        res.removeHeader("Cache-Control");
        res.status(503).json(
          DownloadDictionaryAsset503Response.parse({
            error: "Gói IPA Anh-Anh bổ sung tạm thời chưa tải được. Hãy thử lại.",
          }),
        );
      }
    });
    stream.pipe(res);
  } catch (error) {
    req.log.error({ err: error }, "Cannot serve the UK IPA supplement");
    res.status(503).json(
      DownloadDictionaryAsset503Response.parse({
        error: "Gói IPA Anh-Anh bổ sung tạm thời chưa tải được. Hãy thử lại.",
      }),
    );
  }
});

export default router;
