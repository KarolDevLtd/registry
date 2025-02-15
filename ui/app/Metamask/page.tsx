"use client";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import GradientBG from "../../components/GradientBG";
import styles from "../../styles/Home.module.css";

const CONTRACT_ADDRESS = "0xf5587F079A4537a7090863Ed4C21906A13018EFB";
const ALCHEMY_RPC_URL =
  "https://eth-sepolia.g.alchemy.com/v2/eVGBn7nM03MroI5TYlBcnFMHXQ3_nCAJ";

const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "when",
        type: "uint256",
      },
    ],
    name: "TokensLocked",
    type: "event",
  },
  {
    inputs: [],
    name: "bridgeOperator",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lockTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lockedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

export default function Metamask() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState<
    ethers.providers.JsonRpcSigner | undefined
  >();
  const [contract, setContract] = useState<ethers.Contract | undefined>();
  const [provider, setProvider] = useState(
    new ethers.providers.JsonRpcProvider(ALCHEMY_RPC_URL)
  );
  const [hasWallet, setHasWallet] = useState<null | boolean>(null);
  const [hasBeenSetup, setHasBeenSetup] = useState(false);
  const [lockedAmount, setLockedAmount] = useState<string | undefined>();
  const [walletKeyBase58, setWalletKeyBase58] = useState("");
  const [displayText, setDisplayText] = useState("");

  const displayStep = (step: string) => {
    setDisplayText(step);
    console.log(step);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        setSigner(signer);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        setContract(contract);
        const address = await signer.getAddress();
        console.log("Connected Address:", address);

        setWalletKeyBase58(address);
        setHasWallet(true);

        // Check if the account exists
        // displayStep("Checking if fee payer account exists...");
        // const res = await zkappWorkerClient?.fetchAccount(address);
        // const accountExists = res?.error === null;
        // setAccountExists(accountExists);
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
        // setAccountExists(false);
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
        setSigner(signer);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        setContract(contract);
        const address = await signer.getAddress();
        console.log("Connected Address:", address);

        setWalletKeyBase58(address);
        displayStep("Checking if fee payer account exists...");
        setHasBeenSetup(true);
        setDisplayText("");
      }
    } catch (error: any) {
      displayStep(`Error during setup: ${error.message}`);
    }
  };

  const signMessage = () => {
    if (signer) {
      const message = "Tiddies";
      signer.signMessage(message).then((signature) => {
        console.log("Signature:", signature);
        const digest = ethers.utils.hashMessage(message);
        const publicKey = ethers.utils.recoverPublicKey(digest, signature);
        console.log("Public Key:", publicKey);
      });
    }
  };

  const bridgeOperator = async () => {
    try {
      const readContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      const bridgeOperator = await readContract.bridgeOperator();
      console.log("Bridge Operator:", bridgeOperator);
      alert(`Bridge Operator: ${bridgeOperator}`);
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
              <button
                className={styles.card}
                onClick={() => {
                  signMessage();
                }}
              >
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
