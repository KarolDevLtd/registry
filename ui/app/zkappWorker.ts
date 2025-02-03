/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, PrivateKey, PublicKey, Signature } from "o1js";
import { First } from "../../contracts/src";

const state = {
  zkApp: null as null | First,
};

const functions = {
  spinUp: async () => {
    console.log("spinUp");
    // const Local = await Mina.LocalBlockchain();
    // Mina.setActiveInstance(Local);
    const zkAppPrivateKey = PrivateKey.random();
    const zkAppAddress = zkAppPrivateKey.toPublicKey();
    state.zkApp = new First(zkAppAddress);
  },

  initTransaction: async (args: { adminPublicKey: string }) => {
    const admin = PublicKey.fromBase58(args.adminPublicKey);
    state.zkApp?.initWorld(admin);
  },

  updateValue: (args: { value: number; signature: Signature }) => {
    state.zkApp?.updateValue(Field.from(args.value), args.signature);
  },
};

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
  error: boolean;
  errorMessage: string;
  errorStack?: string;
};

if (typeof window) {
  // if (process.browser) { //TODO check if this is correct
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      try {
        const returnData = await functions[event.data.fn](event.data.args);

        const message: ZkappWorkerReponse = {
          id: event.data.id,
          data: returnData,
          error: false,
          errorMessage: "",
        };
        postMessage(message);
      } catch (error: unknown) {
        // If an error occurs, create a response with an error flag and message
        const err: Error = error as Error;
        const errorMessage: ZkappWorkerReponse = {
          id: event.data.id,
          data: null,
          error: true,
          errorMessage: err.message,
          errorStack: err.stack,
        };
        postMessage(errorMessage);
      }
    }
  );
}
console.log("Web Worker Successfully Initialized.");
