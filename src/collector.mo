import Cycles "mo:base/ExperimentalCycles";
import D "mo:base/Debug";
import Principal "mo:base/Principal";

shared (deployer) actor class Collector<system>()  = this {

  public type DepositArgs = { to : Account; memo : ?Blob };
  public type DepositResult = { balance : Nat; block_index : BlockIndex };
  public type Account = { owner : Principal; subaccount : ?Blob };
  public type BlockIndex = Nat;

  public type Service = actor {
    deposit : shared DepositArgs -> async DepositResult;
  };

  public type ShareArgs = [
    {
      namespace: Text;
      share: Nat;
    }
  ];

  public type ShareCycleError = {
    #NotEnoughCycles: (Nat, Nat);
    #CustomError: {
      code: Nat;
      message: Text;
    };
  };

  /**
    * Lets the NFT accept cycles.
    * @returns {Nat} - The amount of cycles accepted.
    */
  public func icrc85_deposit_cycles<system>(request: ShareArgs) : async {#Ok: Nat; #Err: ShareCycleError} {
    D.print("recived cycles");
    let amount = Cycles.available();
    let accepted = amount;
    ignore Cycles.accept(accepted);
    D.print("recived cycles" # debug_show(accepted));
    #Ok(accepted);
  };

  /**
    * Lets the NFT accept cycles.
    * @returns {Nat} - The amount of cycles accepted.
    */
  public func icrc85_deposit_cycles_notify<system>(request: ShareArgs) : () {
    D.print("recived cycles");
    let amount = Cycles.available();
    let accepted = amount;
    ignore Cycles.accept(accepted);
    D.print("recived cycles" # debug_show(accepted));
   
  };

  public shared(msg) func wallet_withdraw<system>(amount: Nat, owner: ?Principal) : async DepositResult {
    assert(Principal.isController(msg.caller));
    let service : Service = actor("um5iw-rqaaa-aaaaq-qaaba-cai");
    Cycles.add(amount);
    await service.deposit({ to = { owner = switch(owner){
      case(?val) val;
      case(null) msg.caller;
    }; subaccount = null }; memo = null });

  };

};