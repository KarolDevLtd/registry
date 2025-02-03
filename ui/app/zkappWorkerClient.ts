/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ZkappWorkerRequest,
  ZkappWorkerReponse,
  WorkerFunctions,
} from "./zkappWorker";

export default class ZkappWorkerClient {
  spinUp() {
    return this._call("spinUp", {});
  }
  initWorld(adminPublicKey: string) {
    return this._call("initTransaction", { adminPublicKey: adminPublicKey });
  }

  updateValue(value: number, signature: string) {
    return this._call("updateValue", { value: value, signature: signature });
  }

  // ---------------------------------------------------------------------------------------

  worker: Worker;

  promises: {
    [id: number]: { resolve: (res: any) => void; reject: (err: any) => void };
  };

  nextId: number;

  constructor() {
    this.worker = new Worker(new URL("./zkappWorker.ts", import.meta.url));
    this.promises = {};
    this.nextId = 0;

    // this.worker.onmessage = (event: MessageEvent<ZkappWorkerReponse>) => {
    // 	this.promises[event.data.id]?.resolve(event.data.data);
    // 	delete this.promises[event.data.id];
    // };
    this.worker.onmessage = (event: MessageEvent<ZkappWorkerReponse>) => {
      const response = event.data;
      if (response.error) {
        const error = new Error(response.errorMessage);
        error.stack = response.errorStack ?? error.stack; // Preserve the original stack if available
        this.promises[response.id].reject(error);
      } else {
        this.promises[response.id].resolve(response.data);
      }
      delete this.promises[response.id];
    };
  }

  _call(fn: WorkerFunctions, args: any) {
    return new Promise((resolve, reject) => {
      this.promises[this.nextId] = { resolve, reject };

      const message: ZkappWorkerRequest = {
        id: this.nextId,
        fn,
        args,
      };

      this.worker.postMessage(message);

      this.nextId++;
    });
  }
}
