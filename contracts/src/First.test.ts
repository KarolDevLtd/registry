import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  Cache,
  Field,
  Signature,
} from 'o1js';
import { First } from './First';

/*
 * This file specifies how to test the `Test` example smart contract.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */
const proofsEnabled = false;
describe('First', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: First;

  beforeAll(async () => {
    const { verificationKey } = await First.compile({
      cache: Cache.FileSystemDefault,
    });
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new First(zkAppAddress);
  });

  async function localDeploy() {
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
    const adminKey = await zkApp.adminKey.fetch();
    expect(adminKey).not.toBeNull();
  });

  it('correctly initializes the adminKey state', async () => {
    await localDeploy();

    // Initialize adminKey
    const adminPrivateKey = PrivateKey.random();
    const adminPublicKey = adminPrivateKey.toPublicKey();
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(adminPublicKey);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const storedAdminKey = await zkApp.adminKey.fetch();
    expect(storedAdminKey).toEqual(adminPublicKey);
  });

  it('verifies admin signature correctly', async () => {
    await localDeploy();

    //initWorld setup
    const adminPrivateKey = PrivateKey.random();
    const adminPublicKey = adminPrivateKey.toPublicKey();
    const initTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(adminPublicKey);
    });
    await initTxn.prove();
    await initTxn.sign([senderKey]).send();

    //verifyAdmin setup
    const message = Field(1);
    const signature = Signature.create(adminPrivateKey, [message]);
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
    const adminPrivateKey = PrivateKey.random();
    const adminPublicKey = adminPrivateKey.toPublicKey();
    const initTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(adminPublicKey);
    });
    await initTxn.prove();
    await initTxn.sign([senderKey]).send();

    //updateValue setup
    const newValue = Field(1);
    const message = Field(999);
    const signature = Signature.create(adminPrivateKey, [message]);
    const updateTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.updateValue(newValue, message, signature);
    });
    await updateTxn.prove();
    await updateTxn.sign([senderKey]).send();
    const storedValue = await zkApp.value.fetch();
    expect(storedValue).toEqual(newValue);
  });

  it('fails to update value with invalid admin signature', async () => {
    await localDeploy();

    //initWorld setup
    const adminPrivateKey = PrivateKey.random();
    const adminPublicKey = adminPrivateKey.toPublicKey();
    const initTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(adminPublicKey);
    });
    await initTxn.prove();
    await initTxn.sign([senderKey]).send();

    //updateValue setup
    const newValue = Field(1);
    const message = Field(999);
    const invalidPrivateKey = PrivateKey.random();
    const invalidSignature = Signature.create(invalidPrivateKey, [message]);
    await expect(async () => {
      const updateTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.updateValue(newValue, message, invalidSignature);
      });
      await updateTxn.prove();
      await updateTxn.sign([senderKey]).send();
    }).rejects.toThrow();
  });
});
