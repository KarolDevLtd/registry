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
  Provable,
  Permissions,
  DeployArgs,
} from 'o1js';

export class First extends SmartContract {
  // State variable to store the admin's public key
  @state(PublicKey) adminKey = State<PublicKey>();
  @state(Field) value = State<Field>();

  // Method to initialize the admin key
  // @method async initWorld(adminPublicKey: PublicKey) {
  //   Provable.log('inside initWorld with ', adminPublicKey);
  //   super.init(); // Initialize the contract
  //   this.adminKey.set(adminPublicKey); // Store the admin's public key
  //   this.value.set(Field(1));
  // }

  // @method async init() {
  //   super.init(); // Initialize the contract
  //   Provable.log('inside initWorld with ', args.adminPublicKey);
  //   this.adminKey.set(args.adminPublicKey); // Store the admin's public key
  //   this.value.set(Field(1));
  // }

  //deploy trigers init
  async deploy(args: DeployArgs & { adminPublicKey: PublicKey }) {
    await super.deploy();
    this.account.permissions.set({
      ...Permissions.default(),
    });

    Provable.log('inside initWorld with ', args.adminPublicKey);
    super.init(); // Initialize the contract
    this.adminKey.set(args.adminPublicKey); // Store the admin's public key
    this.value.set(Field(1));
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

  @method async updateValue(message: Field, signature: Signature) {
    Provable.log('inside updateValue with ', message, ' & ', signature);

    await this.verifyAdmin(message, signature);

    let paymentAmount = UInt64.from(2500000000);

    let senderUpdate = AccountUpdate.createSigned(
      this.adminKey.getAndRequireEquals()
    );

    //always guarded by private key of the sender
    senderUpdate.send({ to: this, amount: paymentAmount });

    this.value.set(message);
  }
}
