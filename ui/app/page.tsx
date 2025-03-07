"use client";
import { Field } from "o1js";
import { useEffect, useState } from "react";
import GradientBG from "../components/GradientBG";
import styles from "../styles/Home.module.css";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";

let transactionFee = 0.1;

// const zkAppPrivateKey = PrivateKey.random();
// const zkAppPublicKey = zkAppPrivateKey.toPublicKey();
// console.log("Private key", zkAppPrivateKey.toBase58());
// console.log("Public key", zkAppPublicKey.toBase58());

const zkAppPrivateKey = "EKFJ6DSX9HNM6jbLBG5RYv7tSLK8CrQRZWbDYAKM1XFyzJ95ssWx";
const zkAppPublicKey =
  "B62qk16EioQdQRr353H3fmXUb3MRoyavUwvi2TYDLnkDtFp5eUaFKMX";
console.log("Private key", zkAppPrivateKey);
console.log("Public key", zkAppPublicKey);

const ZKAPP_ADDRESS = zkAppPublicKey;

export interface SignedData {
  publicKey: string;
  data: string;
  signature: {
    field: string;
    scalar: string;
  };
}

export default function Home() {
  const [zkappWorkerClient, setZkappWorkerClient] =
    useState<null | ZkappWorkerClient>(null);
  const [hasWallet, setHasWallet] = useState<null | boolean>(null);
  const [hasBeenSetup, setHasBeenSetup] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [currentNum, setCurrentNum] = useState<null | Field>(null);
  const [walletKeyBase58, setwalletKeyBase58] = useState("");
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [transactionlink, setTransactionLink] = useState("");

  const displayStep = (step: string) => {
    setDisplayText(step);
    console.log(step);
  };

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    const setup = async () => {
      try {
        if (!hasBeenSetup) {
          displayStep("Loading web worker...");
          const zkappWorkerClient = new ZkappWorkerClient();
          setZkappWorkerClient(zkappWorkerClient);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          displayStep("Done loading web worker");

          await zkappWorkerClient.setActiveInstanceToLightnet();
          // await zkappWorkerClient.setActiveInstanceToDevnet();

          const mina = (window as any).mina;
          if (mina == null) {
            setHasWallet(false);
            displayStep("Wallet not found.");
            return;
          }

          const walletKeyBase58: string = (await mina.requestAccounts())[0];
          setwalletKeyBase58(walletKeyBase58);
          displayStep(`Using key:${walletKeyBase58}`);

          displayStep("Checking if fee payer account exists...");
          const res = await zkappWorkerClient.fetchAccount(walletKeyBase58);
          const accountExists = res.error === null;
          setAccountExists(accountExists);

          await zkappWorkerClient.loadContract();

          displayStep("Compiling zkApp...");
          await zkappWorkerClient.compileContract();
          displayStep("zkApp compiled");

          await zkappWorkerClient.initFirst(ZKAPP_ADDRESS);

          displayStep("Getting zkApp state...");
          await zkappWorkerClient.fetchAccount(ZKAPP_ADDRESS);
          // const currentNum = await zkappWorkerClient.getNum();
          setCurrentNum(currentNum);
          console.log(`Current state in zkApp: ${currentNum}`);

          setHasBeenSetup(true);
          setHasWallet(true);
          setDisplayText("");
        }
      } catch (error: any) {
        displayStep(`Error during setup: ${error.message}`);
      }
    };

    setup();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    const checkAccountExists = async () => {
      if (hasBeenSetup && !accountExists) {
        try {
          for (;;) {
            displayStep("Checking if fee payer account exists...");

            const res = await zkappWorkerClient!.fetchAccount(walletKeyBase58);
            const accountExists = res.error == null;
            if (accountExists) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } catch (error: any) {
          displayStep(`Error checking account: ${error.message}`);
        }
      }
      setAccountExists(true);
    };

    checkAccountExists();
  }, [zkappWorkerClient, hasBeenSetup, accountExists]);

  // -------------------------------------------------------
  // Send a transaction

  const onSendInitTransaction = async () => {
    try {
      setTransactionInProgress(true);
      displayStep("Creating a init transaction...");

      console.log("walletKeyBase58 sending to worker", walletKeyBase58);
      await zkappWorkerClient!.fetchAccount(walletKeyBase58);

      await zkappWorkerClient!.deployZkappInstance(walletKeyBase58);

      displayStep("Creating proof...");
      await zkappWorkerClient!.proveTransaction();

      displayStep("Requesting send init transaction...");
      const transactionJSON = await zkappWorkerClient!.getTransactionJSON();

      displayStep("Getting int transaction JSON...");
      const { hash } = await (window as any).mina.sendTransaction({
        transaction: transactionJSON,
        feePayer: {
          fee: transactionFee,
          memo: "deploying contract",
        },
      });
    } catch (error) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const onSendUpdateTransaction = async () => {
    try {
      setTransactionInProgress(true);
      displayStep("Creating a update transaction...");

      console.log("walletKeyBase58 sending to worker", walletKeyBase58);
      await zkappWorkerClient!.fetchAccount(walletKeyBase58);

      const mina = (window as any).mina;

      const data = await mina
        ?.signMessage({ message: "4" })
        .catch((err: any) => err);

      const siggy = data;

      // Extract the signature fields
      const { field, scalar } = data.signature;

      // Convert the signature to O1JS Signature type
      // const o1jsSignature = new Signature({
      //   r: field,
      //   s: scalar,
      // });

      // const o1jsSignature = new Signature(field, scalar);

      // Signature.create(data.signature.)

      console.log("siggy", siggy);
      console.log("siggy.data", siggy.data);
      // console.log("o1jsSignature", o1jsSignature);
      // console.log(
      //   "o1jsSignature signature verify",
      //   o1jsSignature.verify(PublicKey.fromBase58(walletKeyBase58), [
      //     Field("test"),
      //   ])
      // );

      await zkappWorkerClient!.createUpdateTransaction(
        1,
        data,
        walletKeyBase58
      );

      displayStep("Creating proof...");
      // await zkappWorkerClient!.proveTransaction();

      displayStep("Requesting send update transaction...");
      // const transactionJSON = await zkappWorkerClient!.getTransactionJSON();

      displayStep("Getting update  transaction JSON...");
      // const { hash } = await (window as any).mina.sendTransaction({
      //   transaction: transactionJSON,
      //   feePayer: {
      //     fee: transactionFee,
      //     memo: "",
      //   },
      // });

      // const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
      // setTransactionLink(transactionLink);
      // setDisplayText(transactionLink);

      setTransactionInProgress(false);
    } catch (error) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshCurrentNum = async () => {
    try {
      displayStep("Getting zkApp state...");
      await zkappWorkerClient!.fetchAccount(ZKAPP_ADDRESS);
      const currentNum = await zkappWorkerClient!.getNum();
      setCurrentNum(currentNum);
      console.log(`Current state in zkApp: ${currentNum}`);
      setDisplayText("");
    } catch (error: any) {
      displayStep(`Error refreshing state: ${error.message}`);
    }
  };

  // -------------------------------------------------------
  // Create UI elements

  let auroLinkElem;
  if (hasWallet === false) {
    const auroLink = "https://www.aurowallet.com/";
    auroLinkElem = (
      <div>
        Could not find a wallet.{" "}
        <a href="https://www.aurowallet.com/" target="_blank" rel="noreferrer">
          Install Auro wallet here
        </a>
      </div>
    );
  }

  const stepDisplay = transactionlink ? (
    <a
      href={transactionlink}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: "underline" }}
    >
      View transaction
    </a>
  ) : (
    displayText
  );

  let setup = (
    <div
      className={styles.start}
      style={{ fontWeight: "bold", fontSize: "1.5rem", paddingBottom: "5rem" }}
    >
      {stepDisplay}
      {auroLinkElem}
    </div>
  );

  let accountDoesNotExist;
  if (hasBeenSetup && !accountExists) {
    const faucetLink = `https://faucet.minaprotocol.com/?address='${walletKeyBase58}`;
    accountDoesNotExist = (
      <div>
        <span style={{ paddingRight: "1rem" }}>Account does not exist.</span>
        <a href={faucetLink} target="_blank" rel="noreferrer">
          Visit the faucet to fund this fee payer account
        </a>
      </div>
    );
  }

  let mainContent;
  if (hasBeenSetup && accountExists) {
    mainContent = (
      <div style={{ justifyContent: "center", alignItems: "center" }}>
        <div className={styles.center} style={{ padding: 0 }}>
          REGISTRY
        </div>
        <div className={styles.center} style={{ padding: 0 }}>
          Current state in zkApp: {currentNum?.toString()}{" "}
        </div>
        <button
          className={styles.card}
          onClick={onSendInitTransaction}
          disabled={transactionInProgress}
        >
          Init Transaction
        </button>
        <button
          className={styles.card}
          onClick={onSendUpdateTransaction}
          disabled={transactionInProgress}
        >
          Send Transaction
        </button>
        <button className={styles.card} onClick={onRefreshCurrentNum}>
          Get Latest State
        </button>
      </div>
    );
  }

  return (
    <GradientBG>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          {setup}
          {accountDoesNotExist}
          {mainContent}
        </div>
      </div>
    </GradientBG>
  );
}
