import { parentPort } from 'node:worker_threads';
import { PDFParse } from 'pdf-parse';

parentPort.on('message', async (msg) => {
  try {
    const parser = new PDFParse({ data: new Uint8Array(Buffer.from(msg.dataBase64, 'base64')) });
    try {
      const result = await parser.getText();
      parentPort.postMessage({ ok: true, id: msg.id, pages: result.pages.length });
    } catch (error) {
      parentPort.postMessage({ ok: false, id: msg.id, error: error.message });
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    parentPort.postMessage({ ok: false, id: msg.id, error: error.message });
  }
});
