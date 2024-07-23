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
    caller: Principal
  ): MigrationTypes.State {

   // debug if (debug_channel.announce) D.print("in migrate" # debug_show(prevState));
    var state = prevState;
    var migrationId = getMigrationId(prevState);
    debug if (debug_channel.announce) D.print("getting migration id");
    let nextMigrationId = getMigrationId(nextState);
    debug if (debug_channel.announce) D.print(debug_show(nextMigrationId));

    while (nextMigrationId > migrationId) {
      debug if (debug_channel.announce) D.print("in upgrade while" # debug_show((nextMigrationId, migrationId)));
      let migrate = upgrades[migrationId];
      debug if (debug_channel.announce) D.print("upgrade should have run");
      migrationId := if (nextMigrationId > migrationId) migrationId + 1 else migrationId - 1;

      state := migrate(state, args, caller);
    };

    return state;
  };
};