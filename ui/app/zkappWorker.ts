import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  Signature,
  fetchAccount,
} from "o1js";
import * as Comlink from "comlink";
import type { First } from "../../contracts/src/First";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  FirstInstance: null as null | typeof First,
  zkappInstance: null as null | First,
  transaction: null as null | Transaction,
};

export const api = {
  setActiveInstanceToLightnet: async () => {
    const Network = Mina.Network({
      networkId: "testnet",
      mina: "http://localhost:8080/graphql",
      archive: "http://localhost:8282",
      lightnetAccountManager: "http://localhost:8181",
    });
    console.log("Lightnet network instance configured.");
    Mina.setActiveInstance(Network);
  },
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
  async deployZkappInstance(publicKey58: string, adminKey58: string) {
    state.transaction = await Mina.transaction(async () => {
      // const publicKey = PublicKey.fromBase58(publicKey58);
      // state.zkappInstance = new state.FirstInstance!(publicKey);
      AccountUpdate.fundNewAccount(PublicKey.fromBase58(adminKey58));
      state.zkappInstance?.deploy({
        adminPublicKey: PublicKey.fromBase58(adminKey58),
      });
    });
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
      // const x = Signature.fromBase58(signature.signature);
      await state.zkappInstance.updateValue(Field(4), signature);
    });
  },
  async proveTransaction() {
    await state.transaction!.prove();
  },
  async getTransactionJSON() {
    return state.transaction!.toJSON();
  },
  async getDeployTransactionJSON() {
    return state.transaction
      ?.sign([
        PrivateKey.fromBase58(
          "EKFJ6DSX9HNM6jbLBG5RYv7tSLK8CrQRZWbDYAKM1XFyzJ95ssWx"
        ),
      ])
      .toJSON();
  },
};

// Expose the API to be used by the main thread
Comlink.expose(api);
