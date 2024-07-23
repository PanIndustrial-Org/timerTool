import D "mo:base/Debug";
import Principal "mo:base/Principal";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Timer "mo:base/Timer";
import Text "mo:base/Text";
import Star "mo:star/star";
import TT "lib";

shared (deployer) actor class TimerTool<system>(args : TT.Args)  = this {


  let OneMinute = 60_000_000_000;


 D.print("in test canister " # debug_show(args));

  public shared ({ caller }) func hello_world() : async Text {
    return "Hello World!";
  };

  public query func hello() : async Nat {
      // Implementation of permitted drift logic
      60_000_000_000;//  1 minute
  };

  public query func get_stats<system>() : async TT.Stats {
    return qTimerTool().getStats();
  };

  public query func get_counter<system>() : async Nat {
    return currentCount;
  };

  stable var currentCount = 0 : Nat;
  stable let timerState = TT.init(TT.initialState(),#v0_1_0(#id), args, deployer.caller);

  //D.print("base state " # debug_show(timerState));

  var canisterId_ : ?Principal = null;

  private func getCanister() : Principal {
    switch(canisterId_){
      case(null){
        let x = Principal.fromActor(this);
        canisterId_ := ?x;
        x;
      };
      case(?val) val;
    };
  };


  private func getEnvironment() : TT.Environment{
    {      
      advanced = null;
      reportExecution = ?reportExecution;
      reportError = ?reportError;
    };
  };

  var timerTool_ : ?TT.TimerTool = null;

  private func timerTool<system>() : TT.TimerTool{
    switch(timerTool_){
      case(null){
        let x = TT.TimerTool(?timerState, getCanister(), getEnvironment());
        timerTool_ := ?x;
        x;
      };
      case(?val) val;
    };
  };

  private func qTimerTool() : TT.TimerTool{
    switch(timerTool_){
      case(null){
       D.trap("timer tool not init");
      };
      case(?val) val;
    };
  };

  private func getState() : TT.CurrentState {
    let #v0_1_0(#data(val)) = timerState else D.trap("state not init");
    val;
  };

  private func inc(amt : Nat) : Nat {
    currentCount += amt;
    currentCount;
  };

  private func handleTimer<system>(id: TT.ActionId, action: TT.Action) : TT.ActionId{

    D.print("in handle timer " # debug_show((id,action)));
    switch(action.actionType){
      case("inc"){
        D.print("in inc");
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");

        D.print("amt " # debug_show(amt));
        ignore inc(amt);
        id;
      };
      case("trapfor10"){
        D.print("in trapfor10");
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");
        if(Int.abs(Time.now()) > amt){
          return id ;
        } else
        {
          D.print("trapping");
          D.trap("unexpected!");
        };
      };
      case("delay.1.minute"){
        D.print("in delay.1.minute sync " # debug_show(action));
        if(action.retries == 0) D.trap("unexpected");
        
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");
        ignore inc(amt);
        return id;
      };
      case(_) id;
    };
  };

  private func handleTimerSpecific<system>(id: TT.ActionId, action: TT.Action) : TT.ActionId{

    D.print("in handle timer specific" # debug_show((id,action)));
    switch(action.actionType){
      case("specific"){
        D.print("in inc");
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");

        D.print("amt " # debug_show(amt));
        ignore inc(amt);
        id;
      };
      case(_) id;
    };
  };

  private var first_trap = 0 : Int;

  public shared func trap() : async () {
    D.trap("trap");
  };

  public shared func incremote(amt: Nat) : async () {
    ignore inc(amt);
  };

  private func handleTimerASync<system>(id: TT.ActionId, action: TT.Action) : async* Star.Star<TT.ActionId, TT.Error>{

    D.print("in handle timer async " # debug_show((id,action)));
    switch(action.actionType){
      case("incasync"){
        D.print("in inc");
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");

        D.print("amt " # debug_show(amt));
        await incremote(amt);
        #awaited(id);
      };
      case("trapfor10async"){
        D.print("in trapfor10");
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");
        if(Int.abs(Time.now()) > amt){
          return #trappable(id) ;
        } else
        {
          D.print("trapping async");
          await trap();
          D.trap("unexpected!");
        };
      };
      case("delay.1.minuteasync"){
        D.print("in delay.1.minute async ");
        if(action.retries == 0) {
          D.print("setting first trap ");
          first_trap := Time.now();
        };
        if(first_trap + 60_000_000_000 > Time.now() ) {
          D.print("trapping  " # debug_show(Int.toText(Time.now()) ));
          //first_trap := Time.now();
          await trap();
          D.trap("unexpected");
        };
        
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed async delay passed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");
        ignore inc(amt);
        return #trappable(id);
      };
      case(_) #trappable(id);
    };
  };

  private func handleTimerASyncSpecific<system>(id: TT.ActionId, action: TT.Action) : async* Star.Star<TT.ActionId, TT.Error>{

    D.print("in handle timer async specific" # debug_show((id,action)));
    switch(action.actionType){
      case("specificasync"){
        D.print("specificasync");
        let candidParsed :?Nat  = from_candid(action.params);
         D.print("candidParsed" # debug_show(candidParsed));
        let ?amt = candidParsed else D.trap("nat nat");

        D.print("amt " # debug_show(amt));
        ignore inc(amt);
        #awaited(id);
      };
      
      case(_) #trappable(id);
    };
  };


  private func reportExecution(execInfo: TT.ExecutionReport): Bool{
      return false;
  };

  private func reportError(errInfo: TT.ErrorReport) : ?Nat{
    D.print("in report error" # debug_show(errInfo));
    if(errInfo.action.1.actionType == "delay.1.minuteasync"){
      D.print("in report error");
      return ?(Int.abs(Time.now()) + OneMinute);
    };

    if(errInfo.action.1.actionType == "delay.1.minute"){
      D.print("in report error sync");
      return ?(Int.abs(Time.now()) + OneMinute);
    };

    if(errInfo.action.1.actionType == "trapfor10async"){
      D.print("in report error trapfor10async");
      return null; //on purpose
    };
    return null;
  };

  public shared func add_action(time: Nat, action: TT.ActionRequest) : async {
    actionId: TT.ActionId;
    timerStats: TT.Stats;
    currentCounter: Nat;
  } {
    
    let result = timerTool<system>().setActionSync<system>(time, action);

    {
      actionId = result;
      timerStats = qTimerTool().getStats();
      currentCounter = currentCount;
    };
  };

  public shared func add_action_async(time: Nat, action: TT.ActionRequest) : async {
    actionId: TT.ActionId;
    timerStats: TT.Stats;
    currentCounter: Nat;
  } {
    
    let result = timerTool<system>().setActionASync<system>(time, action, OneMinute);

    {
      actionId = result;
      timerStats = qTimerTool().getStats();
      currentCounter = currentCount;
    };
  };

  public shared func cancel_action(id: Nat) : async {
    result : ?Nat;
    timerStats: TT.Stats;
    currentCounter: Nat;
  } {
    
    let result = timerTool<system>().cancelAction<system>(id);

    {
      result = result;
      timerStats = qTimerTool().getStats();
      currentCounter = currentCount;
    };
  };

  public shared func update_max_executions(amt: Nat) : async () {
    
    let state = timerTool<system>().getState();

    state.maxExecutions := amt;

    return;
  };

  public shared func update_collector(req: Text) : async () {
    timerTool<system>().setCollector(req);
    return;
  };

  public shared(msg) func __timer_tool_init__() : async () {
    assert(msg.caller == Principal.fromActor(this));
    ignore timerTool<system>();
    timerTool<system>().registerExecutionListenerAsync(?"incasync", handleTimerASync : TT.ExecutionAsyncHandler);
    timerTool<system>().registerExecutionListenerAsync(?"trapfor10async", handleTimerASync : TT.ExecutionAsyncHandler);
    timerTool<system>().registerExecutionListenerAsync(?"delay.1.minuteasync", handleTimerASync : TT.ExecutionAsyncHandler);
    timerTool<system>().registerExecutionListenerSync(null, handleTimer);
    timerTool<system>().registerExecutionListenerSync(?"specific", handleTimerSpecific);
    timerTool<system>().registerExecutionListenerAsync(?"specificasync", handleTimerASyncSpecific);
    timerTool<system>().initialize<system>();
  };


  //todo: move init routine to library
  private func init() : async () {
    let initActor: actor{
      __timer_tool_init__ : () -> async ();
    } = actor(Principal.toText(Principal.fromActor(this)));
    ignore initActor.__timer_tool_init__();
  };

  ignore Timer.setTimer(#nanoseconds(0), init);

  system func postupgrade(){
    timerTool<system>().registerExecutionListenerAsync(?"incasync", handleTimerASync : TT.ExecutionAsyncHandler);
    timerTool<system>().registerExecutionListenerAsync(?"trapfor10async", handleTimerASync : TT.ExecutionAsyncHandler);
    timerTool<system>().registerExecutionListenerAsync(?"delay.1.minuteasync", handleTimerASync : TT.ExecutionAsyncHandler);
    timerTool<system>().registerExecutionListenerSync(null, handleTimer);
    timerTool<system>().registerExecutionListenerSync(?"specific", handleTimerSpecific);

    timerTool<system>().registerExecutionListenerAsync(?"specificasync", handleTimerASyncSpecific);
    timerTool<system>().initialize<system>();

  }; 

};