import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  Cache,
  createEcdsa,
  createForeignCurve,
  Bytes,
  Crypto,
  UInt64,
} from 'o1js';
import { Metamask } from './Metamask';

/*
 * This file specifies how to test the `Test` example smart contract.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */
const proofsEnabled = false;
class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
// class Scalar extends Secp256k1.Scalar {}
class Ecdsa extends createEcdsa(Secp256k1) {}
class Bytes32 extends Bytes(2) {}

describe('Second', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    adminAccount: Mina.TestPublicKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Metamask,
    ethPrivateKey = Secp256k1.Scalar.random(),
    ethPublicKey = Secp256k1.generator.scale(ethPrivateKey);

  beforeAll(async () => {
    await Metamask.compile({
      cache: Cache.FileSystemDefault,
    });
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount, adminAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key; //deployerAccount - test account with access to both private and public key. deployerAccount.key is provate key
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Metamask(zkAppAddress);
  });

  async function localDeploy() {
    //In the below function, we are using the deployerKey funds to deploy our smart contract at location zkAppPrivateKey
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Test` smart contract', async () => {
    await localDeploy();
    //use fetch in test, instead of get, as it is async call to a network
    const adminKey = await zkApp.ecdsaKey.fetch();
    expect(adminKey).not.toBeNull();
  });

  it('correctly initializes the adminKey state', async () => {
    await localDeploy();

    // Initialize adminKey
    // const adminPrivateKey = PrivateKey.random();
    // const adminPublicKey = adminPrivateKey.toPublicKey();
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(ethPublicKey);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const storedAdminKey = await zkApp.ecdsaKey.fetch();
    expect(storedAdminKey).toEqual(ethPublicKey);
  });

  it('verifies admin signature correctly', async () => {
    await localDeploy();

    //initWorld setup
    // const adminPrivateKey = PrivateKey.random();
    // const adminPublicKey = adminPrivateKey.toPublicKey();
    const initTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(ethPublicKey);
    });
    await initTxn.prove();
    await initTxn.sign([senderKey]).send();

    //verifyAdmin setup
    const message = Bytes32.fromString('t');
    let signature = Ecdsa.sign(message.toBytes(), ethPrivateKey.toBigInt());
    const verifyTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.verifyAdmin(message, signature);
    });
    await verifyTxn.prove();
    await verifyTxn.sign([senderKey]).send();

    // If no error, pass
    expect(true).toBe(true);
  });

  it('updates value with valid admin signature', async () => {
    await localDeploy();

    //initWorld setup
    const initTxn = await Mina.transaction(adminAccount, async () => {
      await zkApp.initWorld(ethPublicKey);
    });
    await initTxn.prove();
    await initTxn.sign([adminAccount.key]).send();

    //updateValue setup
    const message = Bytes32.fromString('t');
    let signature = Ecdsa.sign(message.toBytes(), ethPrivateKey.toBigInt());
    const amount = UInt64.from(2);

    const updateTxn = await Mina.transaction(adminAccount, async () => {
      await zkApp.updateValue(message, signature, amount);
    });
    await updateTxn.prove();

    //Erroring on transaction sign, can use console log below to debug
    console.log(updateTxn.toPretty());

    await updateTxn.sign([adminAccount.key]).send();
    const storedValue = await zkApp.value.fetch();
    expect(storedValue).toEqual(message);
  });

  it('fails to update value with invalid admin signature', async () => {
    await localDeploy();

    //initWorld setup
    // const adminPrivateKey = PrivateKey.random();
    // const adminPublicKey = adminPrivateKey.toPublicKey();
    const initTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(ethPublicKey);
    });
    await initTxn.prove();
    await initTxn.sign([senderKey]).send();

    //updateValue setup

    let badEthPrivateKey = Secp256k1.Scalar.random();
    // let badEthPublicKey = Secp256k1.generator.scale(badEthPrivateKey);
    const message = Bytes32.fromString('t');
    let signature = Ecdsa.sign(message.toBytes(), badEthPrivateKey.toBigInt());
    const amount = UInt64.from(5);
    await expect(async () => {
      const updateTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.updateValue(message, signature, amount);
      });
      await updateTxn.prove();
      await updateTxn.sign([senderKey]).send();
    }).rejects.toThrow();
  });
});
