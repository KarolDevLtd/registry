import {
  SmartContract,
  state,
  State,
  method,
  AccountUpdate,
  UInt64,
  createForeignCurve,
  Crypto,
  createEcdsa,
  Bytes,
  Provable,
} from 'o1js';

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Ecdsa extends createEcdsa(Secp256k1) {}
class Bytes32 extends Bytes(2) {}

let defaultValue = Bytes32.fromString('w');

export class Second extends SmartContract {
  // State variable to store the admin's public key
  // @state(PublicKey) adminKey = State<PublicKey>();
  @state(Bytes32) value = State<Bytes32>();
  @state(Secp256k1) ecdsaKey = State<Secp256k1>();

  // Method to initialize the admin key
  @method async initWorld(adminECDSAKey: Secp256k1) {
    super.init(); // Initialize the contract
    this.ecdsaKey.set(adminECDSAKey); // Store the admin's public key
    this.value.set(defaultValue);
  }

  // verify ownership using a signature
  @method async verifyAdmin(message: Bytes32, signature: Ecdsa) {
    //This line below was suggested by testing...
    // const adminPublicKey = this.adminKey.get(); // Get admin public key
    // this.adminKey.requireEquals(this.adminKey.get());

    //so instead you can do this one line:
    const adminPublicKey = this.ecdsaKey.getAndRequireEquals();

    // Verify the signature
    const isValidSignature = signature.verify(message, adminPublicKey);
    isValidSignature.assertTrue('Valid signature');
    // this.state2.set();
    // AccountUpdate.create(this.sender).update.appState[1].value;
  }

  @method async updateValue(
    message: Bytes32,
    signature: Ecdsa,
    amount: UInt64
  ) {
    await this.verifyAdmin(message, signature);

    let senderUpdate = AccountUpdate.createSigned(
      this.sender.getUnconstrained()
    );

    const userBalance = senderUpdate.account.balance.getAndRequireEquals();
    const paymentAmount = Provable.switch(
      [
        amount.equals(UInt64.zero),
        amount.lessThan(UInt64.from(8)),
        amount
          .greaterThan(UInt64.from(8))
          .and(userBalance.greaterThan(UInt64.from(150))),
        amount
          .greaterThan(UInt64.from(8))
          .and(amount.lessThanOrEqual(UInt64.from(150))),
      ],
      UInt64,
      [UInt64.zero, UInt64.from(2), UInt64.from(100), UInt64.from(10)]
    );

    //always guarded by private key of the sender
    senderUpdate.send({ to: this, amount: paymentAmount });

    this.value.set(message);
  }
}
