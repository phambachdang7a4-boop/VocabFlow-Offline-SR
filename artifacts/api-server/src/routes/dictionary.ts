import { Router, type IRouter } from 'express';
import { DownloadDictionaryAsset503Response } from '@workspace/api-zod';
import { findDictionaryAsset } from '../lib/dictionary-storage';

const router: IRouter = Router();

// Public reference data only. No user vocabulary is ever sent to this server.
router.get('/dictionary/asset', async (req, res): Promise<void> => {
  try {
    const file = await findDictionaryAsset();
    const [metadata] = await file.getMetadata();
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(metadata.size),
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'attachment; filename="dictionary_en_vi.db"',
    });
    const stream = file.createReadStream();
    req.on('close', () => { if (!res.writableEnded) stream.destroy(); });
    stream.on('error', error => {
      req.log.error({ err: error }, 'Dictionary asset stream failed');
      if (res.headersSent) res.destroy(error);
      else {
        res.removeHeader('Content-Length');
        res.removeHeader('Content-Disposition');
        res.removeHeader('Cache-Control');
        res.status(503).json(DownloadDictionaryAsset503Response.parse({ error: 'Kho từ điển tạm thời chưa tải được. Hãy thử lại.' }));
      }
    });
    stream.pipe(res);
  } catch (error) {
    req.log.error({ err: error }, 'Cannot serve the public dictionary asset');
    res.status(503).json(DownloadDictionaryAsset503Response.parse({ error: 'Kho từ điển tạm thời chưa tải được. Hãy thử lại.' }));
  }
});

export default router;
