import {
  SmartContract,
  state,
  State,
  PublicKey,
  method,
  Signature,
  Field,
  AccountUpdate,
} from 'o1js';

export class Test extends SmartContract {
  // State variable to store the admin's public key
  @state(PublicKey) adminKey = State<PublicKey>();
  // @state(Field) state2 = State<Field>();

  // Method to initialize the admin key
  @method async initWorld(adminPublicKey: PublicKey) {
    super.init(); // Initialize the contract
    this.adminKey.set(adminPublicKey); // Store the admin's public key
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
}
