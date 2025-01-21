import {
  SmartContract,
  state,
  State,
  PublicKey,
  method,
  Signature,
  Field,
  AccountUpdate,
  UInt64,
} from 'o1js';

export class First extends SmartContract {
  // State variable to store the admin's public key
  @state(PublicKey) adminKey = State<PublicKey>();
  @state(Field) value = State<Field>();

  // Method to initialize the admin key
  @method async initWorld(adminPublicKey: PublicKey) {
    super.init(); // Initialize the contract
    this.adminKey.set(adminPublicKey); // Store the admin's public key
    this.value.set(Field(0));
  }

  // verify ownership using a signature
  @method async verifyAdmin(message: Field, signature: Signature) {
    //This line below was suggested by testing...
    // const adminPublicKey = this.adminKey.get(); // Get admin public key
    // this.adminKey.requireEquals(this.adminKey.get());

    //so instead you can do this one line:
    const adminPublicKey = this.adminKey.getAndRequireEquals();

    // Verify the signature
    const isValidSignature = signature.verify(adminPublicKey, [message]);
    isValidSignature.assertTrue('Valid signature');
    // this.state2.set();
    // AccountUpdate.create(this.sender).update.appState[1].value;
  }

  @method async updateValue(
    newValue: Field,
    message: Field,
    signature: Signature
  ) {
    await this.verifyAdmin(message, signature);

    let paymentAmount = UInt64.from(2500000000);

    let senderUpdate = AccountUpdate.createSigned(
      this.adminKey.getAndRequireEquals()
    );
    senderUpdate.send({ to: this, amount: paymentAmount });

    this.value.set(newValue);
  }
}
