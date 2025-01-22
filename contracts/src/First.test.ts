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
    adminAccount: Mina.TestPublicKey,
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
    [deployerAccount, senderAccount, adminAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key; //deployerAccount - test account with access to both private and public key. deployerAccount.key is provate key
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new First(zkAppAddress);
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
    const initTxn = await Mina.transaction(adminAccount, async () => {
      await zkApp.initWorld(adminAccount);
    });
    await initTxn.prove();
    await initTxn.sign([adminAccount.key]).send();

    //updateValue setup
    const message = Field(999);
    const signature = Signature.create(adminAccount.key, [message]);
    const updateTxn = await Mina.transaction(adminAccount, async () => {
      await zkApp.updateValue(message, signature);
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
    const adminPrivateKey = PrivateKey.random();
    const adminPublicKey = adminPrivateKey.toPublicKey();
    const initTxn = await Mina.transaction(senderAccount, async () => {
      await zkApp.initWorld(adminPublicKey);
    });
    await initTxn.prove();
    await initTxn.sign([senderKey]).send();

    //updateValue setup
    const message = Field(999);
    const invalidPrivateKey = PrivateKey.random();
    const invalidSignature = Signature.create(invalidPrivateKey, [message]);
    await expect(async () => {
      const updateTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.updateValue(message, invalidSignature);
      });
      await updateTxn.prove();
      await updateTxn.sign([senderKey]).send();
    }).rejects.toThrow();
  });
});
