import Int "mo:base/Int";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import D "mo:base/Debug";
import Error "mo:base/Error";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Option "mo:base/Option";
import Timer "mo:base/Timer";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Migration "./migrations";
import MigrationTypes "./migrations/types";
import ovs_fixed "mo:ovs-fixed";


module {


  public let debug_channel = {
    announce = false;
    cycles = false;
  };

  public type TimerId =               MigrationTypes.Current.TimerId;
  public type Time =                  MigrationTypes.Current.Time;
  public type Action =                MigrationTypes.Current.Action;
  public type ActionRequest =                MigrationTypes.Current.ActionRequest;
  public type ActionId =              MigrationTypes.Current.ActionId;
  public type Error =                 MigrationTypes.Current.Error;
  public type TimeTree =              MigrationTypes.Current.TimeTree;
  public type CurrentState =          MigrationTypes.Current.State;
  public type Stats =                 MigrationTypes.Current.Stats;
  public type Environment =           MigrationTypes.Current.Environment;
  public type ActionDetail =          MigrationTypes.Current.ActionDetail;
  public type ErrorReport =           MigrationTypes.Current.ErrorReport;
  public type ExecutionReport =       MigrationTypes.Current.ExecutionReport;
  public type ExecutionItem =        MigrationTypes.Current.ExecutionItem;
  public type ExecutionHandler =      MigrationTypes.Current.ExecutionHandler;
  public type ExecutionAsyncHandler = MigrationTypes.Current.ExecutionAsyncHandler;

  public let ActionIdCompare =        MigrationTypes.Current.ActionIdCompare;

  public type State =                 MigrationTypes.State;
  public type Args =                  MigrationTypes.Args;
  public func initialState() : State {#v0_0_0(#data)};
  public let currentStateVersion = #v0_1_0(#id);

  public let init = Migration.migrate;

  let OneMinute = 60_000_000_000;
  let OneDay =  86_400_000_000_000;



  public let BTree = MigrationTypes.Current.BTree;
  public let Map = MigrationTypes.Current.Map;

  public type Value = {
    #Nat : Nat;
    #Int : Int;
    #Blob : Blob;
    #Text : Text;
    #Array : [Value];
    #Map: [(Text, Value)];
  };


  public class TimerTool(stored: ?State, canister: Principal, environment: Environment){

      /// Initializes the ledger state with either a new state or a given state for migration. 
      /// This setup process involves internal data migration routines.
      var state : CurrentState = switch(stored){
        case(null) {
          let #v0_1_0(#data(foundState)) = init(initialState(),currentStateVersion, null, canister);
          foundState;
        };
        case(?val) {
          let #v0_1_0(#data(foundState)) = init(val, currentStateVersion, null, canister);
          foundState;
        };
      };

      private let executionListeners = Map.new<Text, ExecutionItem>();

      //q26le-iqaaa-aaaam-actsa-cai
      var collector : Text = "q26le-iqaaa-aaaam-actsa-cai";

      public func getState() : CurrentState {
       
        return state;
      };

      public func getEnvironment() : Environment {
        return environment;
      };

      public func setCollector(req: Text) : () {
        let test = Principal.fromText(req);
        collector := req;
      };

      public func setActionSync<system>(time: Time, action: ActionRequest) : ActionId {
        ensureInit<system>();
        let actionId = {time : Time = time; id = state.nextActionId} : ActionId;
        addAction(actionId, {action with 
          aSync = null;
          retries = 0;});
        scheduleNextTimer<system>();
        actionId;
      };


      public func setActionASync<system>(time: Time, action: ActionRequest, timeout: Nat) : ActionId {
        ensureInit<system>();
        let actionId = {time : Time = time; id = state.nextActionId} : ActionId;
        addAction(actionId, {action with 
          aSync = ?timeout;
          retries = 0;});
        scheduleNextTimer<system>();
        actionId;
      };

      private func addAction(actionId: ActionId, action : Action){
        ignore BTree.insert(state.timeTree, ActionIdCompare, actionId , action);
        state.nextActionId := state.nextActionId + 1;
        ignore Map.put(state.actionIdIndex, Map.nhash, actionId.id, actionId.time);
      };

      private func scheduleNextTimer<system>() {
        debug if (debug_channel.announce) D.print("scheduling next timer");
        let ?nextTime = BTree.min(state.timeTree) else{
          state.expectedExecutionTime := null;
          state.nextTimer := null;
          return;
        };

         debug if (debug_channel.announce) D.print("nextTime" # debug_show(nextTime));

        let now = get_time();
         
        let duration = if(nextTime.0.time > now){
          nextTime.0.time - Int.abs(Time.now());
        } else {
          0;
        };

        debug if (debug_channel.announce) D.print("duration " # debug_show(duration));

        switch(state.nextTimer){
          case(?timerId) {
            debug if (debug_channel.announce) D.print("cancelling timer" # debug_show(timerId));
            Timer.cancelTimer(timerId);
          };
          case(null) {};
        };
       
        state.nextTimer := ?Timer.setTimer<system>(#nanoseconds(duration), executeActions);
        state.expectedExecutionTime := ?(now + duration);

        debug if (debug_channel.announce) D.print("nextTimer " # debug_show(state.nextTimer));

        debug if (debug_channel.announce) D.print("scheduled next timer end " # debug_show(state.nextTimer));
          
      };

      private func scheduleCycleShare<system>() : async() {
        //check to see if it already exists
        switch(state.nextCycleActionId){
          case(?val){
            switch(Map.get(state.actionIdIndex, Map.nhash, val)){
              case(?time) {
                //already in the queue
                return;
              };
              case(null) {};
            };
          };
          case(null){};
        };

        let result = setActionSync<system>(get_time() + (OneDay * 30), ({actionType = "icrc85:ovs:shareaction:timertool"; params = Blob.fromArray([]);}));
        state.nextCycleActionId := ?result.id;
      };

      public type ShareCycleError = {
        #NotEnoughCycles: (Nat, Nat);
        #CustomError: {
          code: Nat;
          message: Text;
        };
      };

      private func shareCycles2<system>() : async (){

        let lastReportId = switch(state.lastActionIdReported){
          case(?val) val;
          case(null) 0;
        };

        let actions = if(state.nextActionId > lastReportId){
          state.nextActionId - lastReportId;
        } else {1;};

        var cyclesToShare = 1_000_000_000_000; //1 XDR

        if(actions > 0){
          let additional = Nat.div(actions, 100000);
          cyclesToShare := cyclesToShare + (additional * 1_000_000_000_000);
          if(cyclesToShare > 100_000_000_000_000) cyclesToShare := 100_000_000_000_000;
        };

        try{
          await* ovs_fixed.shareCycles<system>({
            environment = do?{environment.advanced!.icrc85!};
            namespace = "com.panindustrial.libraries.timertool";
            actions = actions;
            schedule = func <system>(period: Nat) : async* (){
              let result = setActionSync<system>(get_time() + period, {actionType = "icrc85:ovs:shareaction:timertool"; params = Blob.fromArray([]);});
              state.nextCycleActionId := ?result.id;
            };
            cycles = Cycles.balance();
          });
        } catch(e){
          debug if (debug_channel.cycles) D.print("error sharing cycles" # Error.message(e));
        };

        if(state.nextActionId > 0) {state.lastActionIdReported := ?(state.nextActionId - 1);
        } else {
          state.lastActionIdReported := ?0;
        };
      };

      

      private func get_time() : Nat {
         Int.abs(Time.now());
      };

      private func commitpoint() : async(){};

      private func safetyCheck() : async(){
        debug if (debug_channel.announce) D.print("safety check");
        //if the timer is locked, we had a trap and we need to report an error and potentially reschedule the timer
        let ?minAction = BTree.min(state.timeTree) else {
          //we are expecting there to be something here, so if we get here and it is missing we just need to do our best to recover
          state.timerLock := null;
          scheduleNextTimer<system>();
          return;
        };

        //if errors are not handled, the item will be removed;
        //todo: add cancle via error to the trx log.
        switch(environment.reportError){
          case(?val) {
            switch(val({action = minAction; awaited = false; error = {error_code = 2; message = "unknown trap " # debug_show(minAction)};})){
              case(?newTime){
                debug if (debug_channel.announce) D.print("safety resceduling action for handled error " # debug_show(minAction));
                removeAction(minAction.0);
                debug if (debug_channel.announce) D.print("safety adding a new action with " # debug_show( minAction.1.retries + 1));
                addAction({time = newTime; id= minAction.0.id}, {minAction.1 with retries = minAction.1.retries + 1});
              };
              case(null) {
                debug if (debug_channel.announce) D.print("safety removing action for unhandled error " # debug_show(minAction.0));
                removeAction(minAction.0);
              };
            };
          };
          case(null) {
            debug if (debug_channel.announce) D.print("removing action for unhandled error " # debug_show(minAction.0));
            removeAction(minAction.0);
          };
        };
        state.timerLock := null;
        scheduleNextTimer<system>();
      };

      private func executeActions<system>() : async () {

        if(state.timerLock != null){
          debug if (debug_channel.announce) D.print("timer locked");
          return;
        };

        debug if (debug_channel.announce) D.print("executing actions");
        let now = get_time();
        
        state.timerLock := ?now;

        let ?minAction = BTree.min(state.timeTree) else {
          //execute actions was run but there are no actions to execute
          state.expectedExecutionTime := null;
          state.lastExecutionTime := get_time();
          state.timerLock := null;
          state.nextTimer := null;
          return;
        };

        debug if (debug_channel.announce) D.print("minAction" # debug_show(minAction));

        var actionsToExecute = BTree.scanLimit<ActionId,Action>(state.timeTree, ActionIdCompare, minAction.0, {
          time = now;
          id = state.nextActionId;
        },  #fwd, state.maxExecutions);

        debug if (debug_channel.announce) D.print("actionsToExecute" # debug_show(Iter.toArray(actionsToExecute.results.vals())));

        let processed = Buffer.Buffer<(ActionId,Action)>(actionsToExecute.results.size());

        label proc for(thisAction in actionsToExecute.results.vals()){
          debug if (debug_channel.announce) D.print("thisAction" # debug_show(thisAction));

          let executionHandler = switch(Map.get(executionListeners, Map.thash, thisAction.1.actionType)){
            case(?val) val;
            case(null){
              switch(Map.get(executionListeners, Map.thash, "")){//search for the default
                case(?val) val;
                case(null) continue proc;
              };
            };
          };

          debug if (debug_channel.announce) D.print("have execution handler" # debug_show(thisAction));

          if(thisAction.1.actionType == "icrc85:ovs:shareaction:timertool"){
            ignore shareCycles2<system>();
            removeAction(thisAction.0);
            processed.add(thisAction);
            continue proc;
          };

          switch(executionHandler){
            case(#Sync(handler)){

              debug if (debug_channel.announce) D.print("found a sync handler" # debug_show(thisAction));
              //this is a synchronous action
              //we will execute it and remove it from the tree
              let safetyTimer = if(environment.syncUnsafe == null or environment.syncUnsafe == ?false){
                let safetyTimerResult = Timer.setTimer<system>(#nanoseconds(0), safetyCheck);
                await commitpoint();
                ?safetyTimerResult;
              } else null;


              let result = handler<system>(thisAction.0, thisAction.1);
              debug if (debug_channel.announce) D.print("removing action" # debug_show(thisAction.0));
              removeAction(thisAction.0);

              debug if (debug_channel.announce) D.print("result from execution handler" # debug_show(result));

              state.lastExecutionTime := Int.abs(get_time());

              debug if (debug_channel.announce) D.print("done executing sync action");
              switch(safetyTimer){
                case(?val) {
                  Timer.cancelTimer(val);
                  await commitpoint();
                };
                case(null) {};
              };
              switch(environment.reportExecution){
                case(?val) {
                  ignore val({action = thisAction; awaited = false})
                };
                case(null) {};
              };
              processed.add(thisAction);
            };
            case(#Async(handler)){

              debug if (debug_channel.announce) D.print("found a async handler" # debug_show(thisAction));
              //asyncs can only be executed one a time, so the timerLock stays in place until released or delayed.
              let timeout = switch(thisAction.1.aSync){
                case(?val)val;
                case(null) OneMinute * 5; //default is 5 minutes
              };

              let safetyTimer = Timer.setTimer<system>(#nanoseconds(timeout), safetyCheck);

              
              await commitpoint();


              try{
                debug if (debug_channel.announce) D.print("calling the async handler" # debug_show(thisAction.0));
                let result = await* handler(thisAction.0, thisAction.1);

              debug if (debug_channel.announce) D.print("removing action" # debug_show(thisAction.0));

              removeAction(thisAction.0);
                switch(result){
                  case(#awaited(val)){
                    //this function awaited so a state change has occured
                    state.lastExecutionTime := get_time();
                    debug if (debug_channel.announce) D.print("done executing async action");
                    Timer.cancelTimer(safetyTimer);

                    await commitpoint();
                    //report a execution
                    switch(environment.reportExecution){
                      case(?val) {
                        ignore val({action = thisAction; awaited = true})
                      };
                      case(null) {};
                    };
                  };
                  case(#trappable(val)){
                    //this function did not await so no state change has occured
                    state.lastExecutionTime := get_time();
                    debug if (debug_channel.announce) D.print("done executing async action");
                    Timer.cancelTimer(safetyTimer);

                    await commitpoint();
                    switch(environment.reportExecution){
                      case(?val) {
                        ignore val({action = thisAction; awaited = false})
                      };
                      case(null) {};
                    };
                  };
                  case(#err(#awaited(err))){
                    //this function awaited so a state change has occured but we ran into an error
                    //errors are not refiled unless handled and a new time returned
                    debug if (debug_channel.announce) D.print("done executing async action");
                    Timer.cancelTimer(safetyTimer);

                    await commitpoint();
                    switch(environment.reportError){
                      case(?val) {
                        switch(val({action = thisAction; awaited = false; error = err})){
                          case(?newTime){
                            addAction({time = newTime; id= thisAction.0.id}, {thisAction.1 with retries = thisAction.1.retries + 1});
                          };
                          case(null) {};
                        };
                      };
                      case(null) {};
                    };
                  };
                  case(#err(#trappable(err))){
                    //this function did not await so no state change has occured but we ran into an error
                    //errors are not refiled unless handled and a new time returned
                    debug if (debug_channel.announce) D.print("done executing async action");
                    Timer.cancelTimer(safetyTimer);

                    await commitpoint();
                    switch(environment.reportError){
                      case(?val) {
                        switch(val({action = thisAction; awaited = false; error = err})){
                          case(?newTime){
                            addAction({time = newTime; id= thisAction.0.id}, {thisAction.1 with retries = thisAction.1.retries + 1});
                          };
                          case(null) {}
                        };
                      };
                      case(null) {};
                    };
                  };
                };
              } catch(e) {
                D.print("error in async action" # Error.message(e));
                debug if (debug_channel.announce) D.print("done executing async action and found a trap - cancling safety");
                Timer.cancelTimer(safetyTimer);
                //remove the action...we're going to try to add it back....maybe
                removeAction(thisAction.0);
                await commitpoint();
               

                 debug if (debug_channel.announce) D.print("checking errorreport" # debug_show(thisAction.0));
                switch(environment.reportError){
                  case(?val) {
                    debug if (debug_channel.announce) D.print("reported error error" # Error.message(e));
                    switch(val({action = thisAction; awaited = true; error = {error_code= 1; message = Error.message(e)}})){
                      case(?newTime){
                        debug if (debug_channel.announce) D.print("error resceduling action for handled error " # debug_show(thisAction.0));
                        debug if (debug_channel.announce) D.print("error adding a new action with " # debug_show( minAction.1.retries + 1));
                        addAction({time = newTime; id= thisAction.0.id}, {thisAction.1 with retries = thisAction.1.retries + 1});
            
                      };
                      case(null) {};
                    };
                  };
                  case(null) {};
                };
              };
              processed.add(thisAction);
            };
            
          };
        };

        debug if (debug_channel.announce) D.print("done executing actions");

        switch(environment.reportBatch){
          case(?val) {
            await* val(Buffer.toArray(processed));
          };
          case(null) {};
        };

        state.lastExecutionTime := get_time();
        state.timerLock := null;
        scheduleNextTimer<system>();
      };

      private func removeAction(actionId: ActionId) {
        ignore BTree.delete(state.timeTree, ActionIdCompare,actionId);
        ignore Map.remove(state.actionIdIndex, Map.nhash, actionId.id);
      };

      public func cancelAction<system>(actionId: Nat) : ?Nat {
        ensureInit<system>();
        switch(Map.get(state.actionIdIndex, Map.nhash, actionId)){
          case(?time) {
            removeAction({ time; id = actionId});
            scheduleNextTimer<system>();
            ?actionId;
          };
          case(null) {
            null;
          };
        };
      };

      public func registerExecutionListenerSync(namespace: ?Text, handler: ExecutionHandler) : () {
         let finalNamespace = switch(namespace){
          case(?val) val;
          case(null) "";
        };
        ignore Map.put<Text,ExecutionItem>(executionListeners, Map.thash, finalNamespace, #Sync(handler) : ExecutionItem);
      };

      public func registerExecutionListenerAsync(namespace: ?Text, handler: ExecutionAsyncHandler) : () {
        let finalNamespace = switch(namespace){
          case(?val) val;
          case(null) "";
        };
        ignore Map.put<Text,ExecutionItem>(executionListeners, Map.thash, finalNamespace, #Async(handler) :ExecutionItem);
      };

      public func removeExecutionListener(namespace: Text) : () {
        ignore Map.remove<Text,ExecutionItem>(executionListeners, Map.thash, namespace);
      };

      //todd: add a way to upgrade types if necessary.
      public func upgradeArgs<system>(upgrades : [Text], handler: (ActionId, Action) -> ?Action){

        let items : Buffer.Buffer<Text> = Buffer.fromIter(upgrades.vals());

        //loop through each item and report params

        let ?minAction = BTree.min(state.timeTree) else {
          return;
        };

        let ?maxAction = BTree.max(state.timeTree) else {
          return;
        };

        var actionsToExecute = BTree.scanLimit<ActionId,Action>(state.timeTree, ActionIdCompare, minAction.0, maxAction.0,  #fwd, state.maxExecutions);

        label search for(thisAction in actionsToExecute.results.vals()){
          let ?found = Buffer.indexOf<Text>(thisAction.1.actionType, items, Text.equal) else continue search;

          let ?result = handler(thisAction.0, thisAction.1) else continue search;

          removeAction(thisAction.0);
          addAction(thisAction.0, result);
        };
      };

      public func getStats() : Stats {
        {
          timers = BTree.size(state.timeTree);
          nextTimer = state.nextTimer;
          lastExecutionTime = state.lastExecutionTime;
          expectedExecutionTime = state.expectedExecutionTime;
          nextActionId = state.nextActionId;
          minAction = BTree.min(state.timeTree);
          cycles = Cycles.balance();
          maxExecutions = state.maxExecutions;
        }
      };

      public func backUp() : Args {
        ?{
          initialTimers = BTree.toArray(state.timeTree);
          lastExecutionTime = state.lastExecutionTime;
          expectedExecutionTime = switch(state.expectedExecutionTime){
            case(?val) val;
            case(null) 0;
          };
          nextActionId = state.nextActionId;
          lastActionIdReported = state.lastActionIdReported;
          nextCycleActionId = state.nextCycleActionId;
          lastCycleReport = state.lastCycleReport;
          maxExecutions = ?state.maxExecutions;
        }
      };

      debug if (debug_channel.announce) D.print("initializing timer tool with scheduleNextTimer");

      private var init_ = false;

      public func initialize<system>() : () {
        debug if (debug_channel.announce) D.print("initializing");
        ensureInit<system>();
      };

      private func ensureInit<system>() : () {
        debug if (debug_channel.announce) D.print("ensuring init");
        if(init_ == false){
          scheduleNextTimer<system>(); 
          ignore Timer.setTimer<system>(#nanoseconds(OneDay), scheduleCycleShare);
          init_ := true;
        };
      };   

     
  };
};
