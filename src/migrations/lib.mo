import MigrationTypes "./types";
import v0_0_0 "./v000_000_000";
import v0_1_0 "./v000_001_000";
import D "mo:base/Debug";

module {

  public let debug_channel = {
    announce = false;
  };


  let upgrades = [

    v0_1_0.upgrade,
    // do not forget to add your new migration upgrade method here
  ];

  func getMigrationId(state: MigrationTypes.State): Nat {
    return switch (state) {
      case (#v0_0_0(_)) 0;
      case (#v0_1_0(_)) 1;
      // do not forget to add your new migration id here
      // should be increased by 1 as it will be later used as an index to get upgrade/downgrade methods
    };
  };

  public func migrate(
    prevState: MigrationTypes.State, 
    nextState: MigrationTypes.State, 
    args: MigrationTypes.Args,
    caller: Principal,
    canister: Principal
  ): MigrationTypes.State {

   
    var state = prevState;
     
    var migrationId = getMigrationId(prevState);
    let nextMigrationId = getMigrationId(nextState);

    while (migrationId < nextMigrationId) {
      let migrate =  upgrades[migrationId];
      migrationId := migrationId + 1;

      state := migrate(state, args, caller, canister);
    };

    return state;
  };

  public let migration = {
    initialState = #v0_0_0(#data);
    //update your current state version
    currentStateVersion = #v0_0_1(#id);
    getMigrationId = getMigrationId;
    migrate = migrate;
  };

  public type Migration<T,A> = {
    initialState: T;
    currentStateVersion: T;
    getMigrationId: (T) -> Nat;
    migrate: (T,T,A,Principal, Principal) -> T;
  };

  public func runMigration<T,A>(stored : ?T, args: A, owner: Principal, canister: Principal, migration : Migration<T,A>) : T {
    switch (stored) {
      case(null) (migration.migrate(migration.initialState, migration.currentStateVersion, args, owner, canister) : T);
      case(?val) (migration.migrate(val, migration.currentStateVersion, args, owner, canister) : T);
    };
  };
};