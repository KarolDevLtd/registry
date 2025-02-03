"use client";
import Head from "next/head";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import GradientBG from "../components/GradientBG.js";
import styles from "../styles/Home.module.css";
import heroMinaLogo from "../public/assets/hero-mina-logo.svg";
import arrowRightSmall from "../public/assets/arrow-right-small.svg";
import { fetchAccount, Mina, PublicKey } from "o1js";
import { Add, First } from "../../contracts";
import ZkappWorkerClient from "./zkappWorkerClient";

// We've already deployed the Add contract on testnet at this address
// https://minascan.io/devnet/account/B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5
const zkAppAddress = "B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5";

export default function Home() {
  const zkApp = useRef<First>(new Add(PublicKey.fromBase58(zkAppAddress)));

  const [transactionLink, setTransactionLink] = useState<string | null>(null);
  const [contractState, setContractState] = useState<string | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<null | PublicKey>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [zkappWorkerClient, setZkappWorkerClient] =
    useState<null | ZkappWorkerClient>();
  async function timeout(seconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
  }

  // fetch the zkapp state when the page loads
  useEffect(() => {
    (async () => {
      setZkappWorkerClient(new ZkappWorkerClient());
      await timeout(3);

      console.log("Done loading web worker");
      // Mina.setActiveInstance(
      //   Mina.Network("https://api.minascan.io/node/devnet/v1/graphql")
      // );
      // await fetchAccount({ publicKey: zkAppAddress });
      // const num = zkApp.current.num.get();
      // setContractState(num.toString());
      // // Compile the contract so that o1js has the proving key required to execute contract calls
      // console.log(
      //   "Compiling Add contract to generate proving and verification keys"
      // );
      // await Add.compile();
      // setLoading(false);
    })();
  }, []);

  const updateZkApp = useCallback(async () => {
    setTransactionLink(null);
    setLoading(true);

    try {
      // Retrieve Mina provider injected by browser extension wallet
      const mina = (window as any).mina;
      const walletKey: string = (await mina.requestAccounts())[0];
      console.log("Connected wallet address: " + walletKey);
      // await fetchAccount({ publicKey: PublicKey.fromBase58(walletKey) });

      const userPubKey58: string = (await mina.requestAccounts())[0];
      setUserPublicKey(PublicKey.fromBase58(userPubKey58));
      await zkappWorkerClient?.initWorld(userPubKey58);

      //Is there a sign function in wallet that can be used?

      // const signature = await zkappWorkerClient;
      const signature = await mina
        ?.signMessage({ message: "Nice tiddies" })
        .catch((err: any) => err);

      // // Execute a transaction locally on the browser
      // const transaction = await Mina.transaction(async () => {
      //   console.log("Executing Add.update() locally");
      //   await zkApp.current.initWorl();
      // });

      // // Prove execution of the contract using the proving key
      // console.log("Proving execution of Add.update()");
      // await transaction.prove();

      // // Broadcast the transaction to the Mina network
      // console.log("Broadcasting proof of execution to the Mina network");
      // const { hash } = await mina.sendTransaction({
      //   transaction: transaction.toJSON(),
      // });

      // // display the link to the transaction
      // const transactionLink = "https://minascan.io/devnet/tx/" + hash;
      // setTransactionLink(transactionLink);
    } catch (e: any) {
      console.error(e.message);
      let errorMessage = "";

      if (
        e.message.includes(
          "Cannot read properties of undefined (reading 'requestAccounts')"
        )
      ) {
        errorMessage = "Is Auro installed?";
      } else if (e.message.includes("Please create or restore wallet first.")) {
        errorMessage = "Have you created a wallet?";
      } else if (e.message.includes("User rejected the request.")) {
        errorMessage = "Did you grant the app permission to connect?";
      } else {
        errorMessage = "An unknown error occurred.";
      }
      setError(errorMessage);
    } finally {
      console.log("Here");
      setLoading(false);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Mina zkApp UI</title>
        <meta name="description" content="built with o1js" />
        <link rel="icon" href="/assets/favicon.ico" />
      </Head>
      <GradientBG>
        <main className={styles.main}>
          <div className={styles.center}>
            <Image
              className={styles.logo}
              src={heroMinaLogo}
              alt="Mina Logo"
              width="191"
              height="174"
              priority
            />

            <p className={styles.tagline}>
              built with
              <code className={styles.code}> o1js</code>
            </p>
          </div>

          <div className={styles.state}>
            <div>
              <div>
                Contract State:{" "}
                <span className={styles.bold}>{contractState}</span>
              </div>
              {error ? (
                <span className={styles.error}>Error: {error}</span>
              ) : loading ? (
                <div>Loading...</div>
              ) : transactionLink ? (
                <a
                  href={transactionLink}
                  className={styles.bold}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Transaction on MinaScan
                </a>
              ) : (
                <button onClick={updateZkApp} className={styles.button}>
                  Call Add.update()
                </button>
              )}
            </div>
          </div>
        </main>
      </GradientBG>
    </>
  );
}
