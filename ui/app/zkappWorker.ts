import { Field, Mina, PublicKey, Signature, fetchAccount } from "o1js";
import * as Comlink from "comlink";
import type { First } from "../../contracts/src/First";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  FirstInstance: null as null | typeof First,
  zkappInstance: null as null | First,
  transaction: null as null | Transaction,
};

export const api = {
  async setActiveInstanceToDevnet() {
    const Network = Mina.Network(
      "https://api.minascan.io/node/devnet/v1/graphql"
    );
    console.log("Devnet network instance configured");
    Mina.setActiveInstance(Network);
  },
  async loadContract() {
    const { First } = await import("../../contracts/build/src/First.js");
    state.FirstInstance = First;
  },
  async compileContract() {
    await state.FirstInstance!.compile();
  },
  async fetchAccount(publicKey58: string) {
    const publicKey = PublicKey.fromBase58(publicKey58);
    return fetchAccount({ publicKey });
  },
  async initZkappInstance(publicKey58: string, adminKey58: string) {
    const publicKey = PublicKey.fromBase58(publicKey58);
    state.zkappInstance = new state.FirstInstance!(publicKey);
    state.zkappInstance.initWorld(PublicKey.fromBase58(adminKey58));
  },
  async getNum() {
    const currentNum = await state.zkappInstance!.value.get();
    return JSON.stringify(currentNum.toJSON());
  },
  async createUpdateTransaction(value: number, signature: Signature) {
    state.transaction = await Mina.transaction(async () => {
      //   await state.zkappInstance!.updateValue(Field.from(value), signature);
      if (!state.zkappInstance) {
        console.error("zkappInstance is not initialized");
        return;
      }
      await state.zkappInstance.updateValue(
        Field.from(value.toString()),
        signature
      );
    });
  },
  async proveUpdateTransaction() {
    await state.transaction!.prove();
  },
  async getTransactionJSON() {
    return state.transaction!.toJSON();
  },
};

// Expose the API to be used by the main thread
Comlink.expose(api);
