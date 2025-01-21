import { AccountUpdate, Mina, PrivateKey, PublicKey, Cache } from 'o1js';
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
});
