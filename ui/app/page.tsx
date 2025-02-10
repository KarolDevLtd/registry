"use client";
import GradientBG from "../components/GradientBG";
import styles from "../styles/Home.module.css";
import Link from "next/link";

export default function Home() {
  // -------------------------------------------------------
  // Create UI elements
  const setup = (
    <div
      className={styles.start}
      style={{
        fontWeight: "bold",
        fontSize: "1.5rem",
        paddingBottom: "5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Link href="/auro">Auro</Link>
      <Link href="/metamask">Metamask</Link>
    </div>
  );

  return (
    <GradientBG>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          {setup}
        </div>
      </div>
    </GradientBG>
  );
}
