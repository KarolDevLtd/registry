import { AccountUpdate, Mina, PrivateKey, PublicKey } from 'o1js';
import { Test } from './Test';

/*
 * This file specifies how to test the `Test` example smart contract.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

describe('Test', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Test;

  beforeAll(async () => {
    await Test.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain();
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Test(zkAppAddress);
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
    const adminKey = zkApp.adminKey.get();
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

    const storedAdminKey = zkApp.adminKey.get();
    expect(storedAdminKey).toEqual(adminPublicKey);
  });
});
