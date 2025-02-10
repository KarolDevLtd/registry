import { Field } from "o1js";
import * as Comlink from "comlink";

export type SignedData = {
  publicKey: string;
  data: string;
  signature: {
    field: string;
    scalar: string;
  };
};

export default class metamaskZkappWorkerClient {
  // ---------------------------------------------------------------------------------------
  worker: Worker;
  // Proxy to interact with the worker's methods as if they were local
  remoteApi: Comlink.Remote<typeof import("./metamaskZkappWorker").api>;

  constructor() {
    // Initialize the worker from the zkappWorker module
    const worker = new Worker(
      new URL("./metamaskZkappWorker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    // Wrap the worker with Comlink to enable direct method invocation
    this.remoteApi = Comlink.wrap(worker);
  }

  // async setActiveInstanceToLightnet() {
  //   return this.remoteApi.setActiveInstanceToLightnet();
  // }

  // async setActiveInstanceToDevnet() {
  //   return this.remoteApi.setActiveInstanceToDevnet();
  // }

  // async loadContract() {
  //   return this.remoteApi.loadContract();
  // }

  // async compileContract() {
  //   return this.remoteApi.compileContract();
  // }

  // async fetchAccount(publicKeyBase58: string) {
  //   return this.remoteApi.fetchAccount(publicKeyBase58);
  // }

  // async deployZkappInstance(adminKey58: string) {
  //   return this.remoteApi.deployZkappInstance(adminKey58);
  // }

  // async initAuro(zkAppAddress: string) {
  //   return this.remoteApi.initAuro(zkAppAddress);
  // }

  // async getNum(): Promise<Field> {
  //   const result = await this.remoteApi.getNum();
  //   return Field.fromJSON(JSON.parse(result as string));
  // }

  // async createUpdateTransaction(
  //   value: number,
  //   signature: SignedData,
  //   adminKey58: string
  // ) {
  //   return this.remoteApi.createUpdateTransaction(value, signature, adminKey58);
  // }

  // async proveTransaction() {
  //   return this.remoteApi.proveTransaction();
  // }

  // async getTransactionJSON() {
  //   return this.remoteApi.getTransactionJSON();
  // }

  // async getDeployTransactionJSON() {
  //   return this.remoteApi.getDeployTransactionJSON();
  // }
}
