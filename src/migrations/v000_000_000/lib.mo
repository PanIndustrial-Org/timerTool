import MigrationTypes "../types";

module {
  public func upgrade(prevmigration_state: MigrationTypes.State, args: MigrationTypes.Args, caller: Principal, canister: Principal): MigrationTypes.State {

    return #v0_0_0(#data);
  };
};