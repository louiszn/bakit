import { createWorker, bindWorkerToProcess, getWorkerOptions } from "@bakit/gateway";

const worker = createWorker(getWorkerOptions());
bindWorkerToProcess(worker);

await worker.start();
