
// please do not import any types from your project outside migrations folder here
// it can lead to bugs when you change those types later, because migration types should not be changed
// you should also avoid importing these types anywhere in your project directly from here
// use MigrationTypes.Current property instead


import BTreeLib "mo:stableheapbtreemap/BTree";
import StarLib "mo:star/star";
import MapLib "mo:map/Map";
import Map "mo:map/Map";

import Blob "mo:base/Blob";
import D "mo:base/Debug";
import Order "mo:base/Order";
import Nat "mo:base/Nat";
import Result "mo:base/Result";
import Text "mo:base/Text";


module {

  public let BTree = BTreeLib;
  public let Star = StarLib;
  public let Map = MapLib;

  public type TimerId = Nat;
  public type Time = Nat;
  public type ActionId = {
    time: Time;
    id: Nat;
  };

  public type Action = {
    actionType: Text;
    params: Blob;
    aSync: ?Nat; //timeout
    retries: Nat;
  };

  public type ActionRequest = {
    actionType: Text;
    params: Blob;
  };

  public type TimeTree = BTree.BTree<ActionId, Action>;

  public func ActionIdCompare(a: ActionId, b: ActionId) : Order.Order {
    if (a.time == b.time) {
      return Nat.compare(a.id, b.id);
    } else if (a.time > b.time) {
      return #greater;
    } else {
      return #less;
    }
  };

  public type Error = {
    error_code : Nat;
    message : Text;
  };

  public type ActionDetail = (ActionId, Action);

  public type ExecutionReport = {
    action: ActionDetail; 
    awaited: Bool
  };

  public type ErrorReport = {
    action : ActionDetail;
    awaited :  Bool;
    error: Error
  };

  public type Map = [(Text, Value)];

  public type Value = {
    #Int : Int;
    #Map : Map;
    #Nat : Nat;
    #Nat64 : Nat64;
    #Blob : Blob;
    #Text : Text;
    #Array : [Value];
  };

  public type ExecutionHandler = <system>(ActionId, Action) -> ActionId;
  public type ExecutionAsyncHandler = <system>(ActionId, Action) -> async* Star.Star<ActionId,Error>;

  public type ExecutionItem = {
    #Sync : ExecutionHandler;
    #Async : ExecutionAsyncHandler;
  };

  public type Environment = {
    advanced: ?{
      icrc85 : ?{
        kill_switch: ?Bool;
        handler: ?(([(Text, Map)]) -> ());
        period: ?Nat;
        asset: ?Text;
        platform: ?Text;
        tree: ?[Text];
        collector: ?Principal;
      };
    };
    reportExecution : ?((ExecutionReport) -> Bool);
    reportError : ?((ErrorReport) -> ?Nat);
  };

  public type State = {
    timeTree: TimeTree;
    actionIdIndex : Map.Map<Nat, Time>;
    var nextTimer: ?TimerId;
    var lastExecutionTime: Time;
    var expectedExecutionTime: ?Time;
    var timerLock: ?Time;
    var maxExecutions: Nat;
    var nextActionId: Nat;
    var maxExecutionDelay: Nat;
    var lastCycleReport : ?Nat; //time of the last cycle report
    var lastActionIdReported: ?Nat; //last action ID reported, used to 
    var nextCycleActionId: ?Nat; //stores the actionId for the next cycle share action
  };

  public type Stats = {
    timers : Nat;
    nextTimer: ?TimerId;
    lastExecutionTime: Time;
    expectedExecutionTime: ?Time;
    nextActionId : Nat;
    minAction : ?ActionDetail;
    maxExecutions: Nat;
    cycles: Nat;
  };
};