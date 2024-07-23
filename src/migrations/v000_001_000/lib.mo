import MigrationTypes "../types";
import Array "mo:base/Array";
import v0_1_0 "types";
import Nat "mo:base/Nat";
import D "mo:base/Debug";

module {

  public func upgrade(prevmigration_state: MigrationTypes.State, args: MigrationTypes.Args, caller: Principal): MigrationTypes.State {

    D.print("in upgrade " # debug_show(args));

    
    let (
      timeTree : v0_1_0.TimeTree,
      actionIdIndex,
      lastExecutionTime : v0_1_0.Time,
      expectedExecutionTime : v0_1_0.Time,
      nextActionId : Nat,
      lastActionIdReported: ?Nat,
      nextCycleActionId: ?Nat,
      lastCycleReport: ?Nat,
      maxExecutions: Nat
    ) = switch(args){
      case(null){
        (
          v0_1_0.BTree.init<v0_1_0.ActionId, v0_1_0.Action>(?32), 
          v0_1_0.Map.new<Nat, v0_1_0.Time>(),
          0, 
          0,
          0,
          null,
          null,
          null,
          10);
      };
      case(?val){
        (
          v0_1_0.BTree.fromArray<v0_1_0.ActionId, v0_1_0.Action>(32, v0_1_0.ActionIdCompare, val.initialTimers),
          v0_1_0.Map.fromIter<Nat, v0_1_0.Time>(Array.map<(v0_1_0.ActionId, v0_1_0.Action), (Nat, Nat)>(val.initialTimers, func(x: (v0_1_0.ActionId, v0_1_0.Action)) : (Nat, Nat){(x.0.id, x.0.time)}).vals(), v0_1_0.Map.nhash),
          val.lastExecutionTime,
          val.expectedExecutionTime,
          val.nextActionId,
          val.lastActionIdReported,
          val.nextCycleActionId,
          val.lastCycleReport,
          switch(val.maxExecutions){
            case(?maxExecutions) maxExecutions;
            case(null) 10;
          }
        )
      };
    };

    let state : v0_1_0.State = {
      timeTree : v0_1_0.TimeTree = timeTree;
      actionIdIndex = actionIdIndex;
      var nextTimer = null;
      var lastExecutionTime = lastExecutionTime;
      var expectedExecutionTime = ?expectedExecutionTime;
      var maxExecutions = maxExecutions;
      var timerLock = null;
      var nextActionId = nextActionId;
      var maxExecutionDelay = 5 * 60 * 1_000_000_000; //5 minutes
      var lastActionIdReported = lastActionIdReported;
      var lastCycleReport = lastCycleReport;
      var nextCycleActionId = nextCycleActionId;
    };

    return #v0_1_0(#data(state));
  };

};