import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  Signature,
  fetchAccount,
  Cache,
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
    await state.FirstInstance!.compile({
      cache: Cache.FileSystemDefault,
    });
  },
  async deployZkappInstance(adminKey58: string) {
    const admin = PublicKey.fromBase58(adminKey58);
    const transaction = await Mina.transaction({ sender: admin }, async () => {
      //SP Below line needs uncommenting when deploying first time
      // AccountUpdate.fundNewAccount(admin);
      await state.zkappInstance?.deploy({
        adminPublicKey: admin,
      });
    });

    transaction.sign([
      PrivateKey.fromBase58(
        "EKFJ6DSX9HNM6jbLBG5RYv7tSLK8CrQRZWbDYAKM1XFyzJ95ssWx"
      ),
    ]);

    state.transaction = transaction;
  },
  async initFirst(zkAppAddress: string) {
    const publicKey = PublicKey.fromBase58(zkAppAddress);
    state.zkappInstance = new state.FirstInstance!(publicKey);
  },
  async getNum() {
    const currentNum = await state.zkappInstance!.value.get();
    return JSON.stringify(currentNum.toJSON());
  },
  async createUpdateTransaction(
    value: number,
    signature: string,
    adminKey58: string
  ) {
    const admin = PublicKey.fromBase58(adminKey58);

    const sig = Signature.fromBase58(
      "7mX9yHg4rVt62SFmM2v8svtG4R5F8r4uY9fgbNj88czeQb4SScPQc8r1e5suuKsNcYXPLzaQdjismPmJRFsWypcQhfxcrRkC"
    );

    state.transaction = await Mina.transaction({ sender: admin }, async () => {
      //   await state.zkappInstance!.updateValue(Field.from(value), signature);
      // if (!state.zkappInstance) {
      //   console.error("zkappInstance is not initialized");
      //   return;
      // }
      await state.zkappInstance!.updateValue(Field(4), sig);
    });
  },
  async proveTransaction() {
    await state.transaction!.prove();
  },
  async getTransactionJSON() {
    return state.transaction!.toJSON();
  },
  // async getDeployTransactionJSON() {
  //   return state.transaction
  //     ?.sign([
  //       PrivateKey.fromBase58(
  //         "EKFJ6DSX9HNM6jbLBG5RYv7tSLK8CrQRZWbDYAKM1XFyzJ95ssWx"
  //       ),
  //     ])
  //     .toJSON();
  // },
  // async fetchAccount(args: { publicKey: string; tokenId?: string }) {
  //   const publicKey = PublicKey.fromBase58(args.publicKey);
  //   try {
  //     if (args.tokenId === undefined) {
  //       const result = await fetchAccount({ publicKey: args.publicKey });
  //       // console.log('fetchAccount result:', result);
  //       return result;
  //     } else {
  //       const tokenId = new Field(args.tokenId);
  //       console.log("fetching account with token id", args.tokenId);
  //       const result = await fetchAccount({ publicKey, tokenId: tokenId });
  //       return result;
  //     }
  //   } catch (error) {
  //     console.error("Error in fetchAccount:", error);
  //   }
  // },
  async fetchAccount(publicKey58: string) {
    const publicKey = PublicKey.fromBase58(publicKey58);
    return fetchAccount({ publicKey });
  },
};

// Expose the API to be used by the main thread
Comlink.expose(api);
