"use client";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import GradientBG from "@/components/GradientBG";
import styles from "@/styles/Home.module.css";
import contractABI from "@/contractABI.json";

const initializeContract = async (
  contractAddress: string,
  abi: any,
  signer: ethers.providers.JsonRpcProvider
): Promise<ethers.Contract> => {
  return new ethers.Contract(contractAddress, abi, signer);
};

export default function Metamask() {
  const [signer, setSigner] = useState<
    ethers.providers.JsonRpcSigner | undefined
  >();
  const [contract, setContract] = useState<ethers.Contract | undefined>();
  const [provider, setProvider] = useState(
    new ethers.providers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL
    )
  );
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [hasBeenSetup, setHasBeenSetup] = useState(false);
  const [lockedAmount, setLockedAmount] = useState<string | undefined>();
  const [walletKeyBase58, setWalletKeyBase58] = useState("");
  const [displayText, setDisplayText] = useState("");

  const displayStep = (step: string) => {
    setDisplayText(step);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!window.ethereum) {
          throw new Error("MetaMask is not installed");
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        setProvider(provider);
        setSigner(signer);
        setWalletKeyBase58(address);
        setHasWallet(true);

        const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
        const contract = await initializeContract(
          contractAddress,
          contractABI,
          signer
        );
        setContract(contract);
      } catch (error: any) {
        console.error("Error during initialization:", error.message);
        setHasWallet(false);
      }
    };

    initialize();

    window.ethereum?.on("accountsChanged", (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletKeyBase58(accounts[0]);
        setHasWallet(true);
      } else {
        setWalletKeyBase58("");
        setHasWallet(false);
      }
    });
  }, []);

  const setup = async () => {
    try {
      if (!hasBeenSetup) {
        displayStep("Loading web worker...");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        setSigner(signer);
        setWalletKeyBase58(address);
        setHasBeenSetup(true);
        setDisplayText("");
      }
    } catch (error: any) {
      displayStep(`Error during setup: ${error.message}`);
    }
  };

  const signMessage = async () => {
    if (!signer) return;
    try {
      const message = "signing";
      const signature = await signer.signMessage(message);
      const digest = ethers.utils.hashMessage(message);
      const publicKey = ethers.utils.recoverPublicKey(digest, signature);
      console.log("Public Key:", publicKey);
    } catch (error) {
      console.error("Error signing message:", error);
    }
  };

  const bridgeOperator = async () => {
    if (!provider) return;
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
      const readContract = await initializeContract(
        contractAddress,
        contractABI,
        provider
      );
      const operator = await readContract.bridgeOperator();
      alert(`Bridge Operator: ${operator}`);
    } catch (error) {
      console.error("Error calling bridgeOperator:", error);
      alert("Failed to fetch bridge operator. Check console for details.");
    }
  };

  const lockTokens = async () => {
    if (!contract) return alert("Connect wallet first!");
    try {
      const tx = await contract.lockTokens({
        value: ethers.utils.parseEther("0.0000000000000001"),
      });
      await tx.wait();
      alert("Tokens locked successfully!");
    } catch (error) {
      console.error("Error calling lockTokens:", error);
      alert("Transaction failed. Check console for details.");
    }
  };

  const getLockedTokens = async () => {
    if (!contract) return alert("Connect wallet first!");
    try {
      const amount = await contract.lockedTokens(walletKeyBase58);
      setLockedAmount(ethers.utils.formatEther(amount));
    } catch (error) {
      console.error("Error fetching locked tokens:", error);
      alert("Transaction failed. Check console for details.");
    }
  };

  useEffect(() => {
    console.log("Contract Address:", process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
    console.log("Alchemy RPC URL:", process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL);
  }, []);

  return (
    <GradientBG>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          {hasBeenSetup && hasWallet ? (
            <div style={{ justifyContent: "center", alignItems: "center" }}>
              <div className={styles.center} style={{ padding: 0 }}>
                {walletKeyBase58 && lockedAmount
                  ? `There is locked amount ${lockedAmount} on wallet ${walletKeyBase58}`
                  : `INTERACT WITH TOKEN BRIDGE`}
              </div>
              <button className={styles.card} onClick={signMessage}>
                Sign Message
              </button>
              <button className={styles.card} onClick={bridgeOperator}>
                Get Bridge Operator
              </button>
              <button onClick={lockTokens} className={styles.card}>
                Lock Tokens
              </button>
              <button onClick={getLockedTokens} className={styles.card}>
                Get Locked Tokens
              </button>
            </div>
          ) : (
            <div style={{ justifyContent: "center", alignItems: "center" }}>
              <div className={styles.center} style={{ padding: 0 }}>
                REGISTRY
              </div>
              <button className={styles.card} onClick={setup}>
                Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </GradientBG>
  );
}
