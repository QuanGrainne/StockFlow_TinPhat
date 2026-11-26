// Kết thúc lượt chạy: dừng đúng các tiến trình do global setup mở, đo lại stockflow_dev để chứng minh không bị ghi.
import fs from 'node:fs';
import path from 'node:path';
import { E2E_ROOT, loadEnv } from './env';
import { devDbWriteCounter } from './pg';
import { killTree, log, processAlive } from './stack';
import { RUN_FILE, type RunInfo } from './data';

export default async function globalTeardown(): Promise<void> {
  if (!fs.existsSync(RUN_FILE)) return;
  const info = JSON.parse(fs.readFileSync(RUN_FILE, 'utf8')) as RunInfo;
  for (const pid of [info.webPid, info.apiPid]) if (pid !== undefined) killTree(pid);
  await new Promise((r) => setTimeout(r, 1000));
  const env = loadEnv();
  const after = await devDbWriteCounter(env);
  const devUnchanged = info.devWriteCounterBefore === after;
  const summary = {
    ...info,
    finishedAt: new Date().toISOString(),
    devWriteCounterAfter: after,
    devDbUnchanged: devUnchanged,
    processesStopped: [info.webPid, info.apiPid].every((p) => p === undefined || !processAlive(p)),
  };
  const out = path.join(E2E_ROOT, 'reports', 'raw', `run-${info.runId}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  log(`Kết thúc run ${info.runId}: stockflow_dev ${devUnchanged ? 'không đổi' : 'CÓ THAY ĐỔI (kiểm tra tiến trình khác đang dùng stockflow_dev)'}; tóm tắt ${out}`);
}
