# Timer Tool

The Timer Tool library provides an API for scheduling timer events with arguments for Motoko projects on the Internet Computer (IC). It ensures that these timer events can recover themselves after an upgrade.

## Features

- Schedule timer events with arguments
- Supports synchronous and asynchronous actions
- Timers are recoverable after upgrades
- Provides state management and reporting

## Installation

`mops install timerTool`

Include the Timer Tool in your Motoko project by importing the necessary modules:

```motoko
import Timer "mo:timerTool";
```

## Usage

### Initialization

To initialize the Timer Tool, you need to create an instance of the `TimerTool` class using the [class+ pattern](https://forum.dfinity.org/t/writing-motoko-stable-libraries/21201), passing the initial state, canister principal, and environment configuration:

```motoko

stable let timerState = TT.init(TT.initialState(),#v0_1_0(#id), args, deployer.caller);

let timerTool = TimerTool(timerState, Principal.fromText("your-canister-principal"), { advanced = null; reportExecution = null; reportError = null });
```

#### Available Arguments

Args should not be necessary unless upgrading from a corrupted state or needing to overwrite the default number of events to process per round(10).

```
  public type Args = ?{
    initialTimers : [(v0_1_0.ActionId, v0_1_0.Action)]; //any initial timers(used for forced upgrades, should not be necessary under most conditions)
    lastExecutionTime: v0_1_0.Time;//last time a timer ran(used for forced upgrades, should not be necessary under most conditions)
    expectedExecutionTime: v0_1_0.Time;//expected next timer(used for forced upgrades, should not be necessary under most conditions)
    nextActionId : Nat;//next action id that will be assigned(used for forced upgrades, should not be necessary under most conditions)
    lastActionIdReported: ?Nat;//last icrc85 event id(used for forced upgrades, should not be necessary under most conditions)
    nextCycleActionId: ?Nat;//next icrc85 event(used for forced upgrades, should not be necessary under most conditions)
    lastCycleReport: ?Nat;//historical report info(used for forced upgrades, should not be necessary under most conditions)
    maxExecutions: ?Nat; //maximum number of items that can be processed at a time.
  };

```

### Scheduling Timer Events

The type of timer that you use may depend on what you are doing in your timer. If you need to call other canisters then you likely want to use Async Actions as they have the ability to call other canisters and finish processing over multiple rounds.

#### Synchronous Actions

Schedule a synchronous action to be executed at a specific time:

```motoko
let actionRequest = { actionType = "syncAction"; params = Blob.fromArray([]) };
let actionId = timerTool.setActionSync<system>(time, actionRequest);
```

#### Asynchronous Actions

Schedule an asynchronous action with a timeout:

```motoko
let actionRequest = { actionType = "asyncAction"; params = Blob.fromArray([]) };
let actionId = timerTool.setActionASync<system>(time, actionRequest, timeout);
```

#### Traps

Take care to not trap inside your handlers. When an handler traps due to a non-remote canister call, the execution stops and no more items can be executed during that round.  The safety timer will pick up and attempt to handle the error in the next round, but it is possible to reach a state where your queue grows faster than your ability to process.

#### Multiple executions per round

The default execution per round is 10 timer events.  This setting can be overridden in the initialization args or changed via code:

```
    let state = timerTool<system>().getState();

    state.maxExecutions := amt;
```   

### Managing Timer Events

#### Cancel an Action

Cancel a scheduled action:

```motoko
let cancelled = timerTool.cancelAction<system>(actionId);
```

#### Get Current State

Retrieve the current state of the timer tool:

```motoko
let currentState = timerTool.getState();
```

### Execution Listeners

Register execution listeners to handle specific types of actions. This lets you pair the namespace of your timer event with the handling function.  Items with a null namespace will be used as the default handler if no match is made on the namespace:

#### Synchronous Listener

```motoko

private func handleTransfer(actionId: ActionId, action: Action): ActionId {

  //retrieve expected type from candid
  
  let candidParsed : ?(Value, Nat)  = from_candid(action.params);
  let ?tupleVal = candidParsed else D.trap("unexpected type");
  let ?mapArray = tupleVal.0 else D.trap("not a valid icrc3 block");
  //todo: validate block with ledger
  let #Array(toArray) = getMapValue(mapArray, "to");
  let #Blob(to) = toArray[0];

  if(Principal.fromBlob(to) == Principal.fromActor(this)){
    //handel receiving payment
  };
  actionId;
};

timerTool.registerExecutionListenerSync(?"icrc1Transfer", handleTransfer);

public shared func notify_of_transfer(transferArgs: ICRC3.Value, index: Nat) : () {
  
  //delay processing for 5 minutes
  let actionId = timerTool.setActionSync<system>(Time.now() + (ONE_MINUTE * 5), {
    actionType = "icrc1Transfer";
    params = toCandid((transferArgs, index));
  });
};

```

#### Asynchronous Listener

```motoko
timerTool.registerExecutionListenerAsync(?namespace, handler);
```

### Upgrading Requests

In the event that an object type changes between upgrades, the class provides an `upgradeArgs` function that can be used to identify request types and replace the parameters allowing you to update the candid types.

`public func upgradeArgs<system>(upgrades : [Text], handler: (ActionId, Action) -> ?Action)`

The  `upgrades` array is the ActionType namespaces that you are identifying. They will be passed to the handler tha can upgrade the Action and return it with new parameters.

### Handling Errors

If an error occurs in one of your timers and you have provided a `reportError` handler in your environment configuration, you will be handed the error and the scheduled action and offered the ability to reschedule it or cancel it:

`?((ErrorReport) -> ?Nat)`

Return the new time in Nanoseconds UTC you would like the item scheduled at. If you return `null` the action will be canceled.

### Notification of completion

To be notified when an item has been executed, register a `reportExecution` on your environment configuration.  This action will be called when the action has been successfully processed. No data on the execution is provided, so if you need to respond to the action, you'll need to associate the result/important info in your handler and then look it up by id.

#### Recurring timers

Recurring timers can be implemented by using the reportExecution handler:

```
stable let timerState = TT.init(TT.initialState(),#v0_1_0(#id), args, deployer.caller);

let timerTool = TimerTool(timerState, Principal.fromText("your-canister-principal"), { 
  advanced = null; 
  reportExecution = ?handleRecurringTimers; 
  reportError = ?handleRecurringErrors
});

private func handleRecurringTimers(report : TimerTool.ExecutionReqport) : Bool{

  if(report.action.namespace == "com.myevent.recurring"){
    let actionId = timerTool.setActionSync<system>(Time.now() + (ONE_MINUTE * 5), {
    actionType = "com.myevent.recurring";
    params = Blob.fromArray([]);
  });
  };
};

private func handleRecurringErrors(report : TimerTool.ErrorReport) : Bool {

  if(report.action.namespace == "com.myevent.recurring"){
    let actionId = timerTool.setActionSync<system>(Time.now() + (ONE_MINUTE * 5), {
    actionType = "com.myevent.recurring";
    params = Blob.fromArray([]);
  });
};
  
};


private func handleEvent(actionId: ActionId, action: Action): ActionId {

  //event code
};

timerTool.registerExecutionListenerSync(?"com.myevent.recurring", handleEvent);


```

## Testing

The Timer Tool includes TypeScript tests to verify its behavior. Refer to the provided test file for examples of expected usage and test cases.


## OVS Default Behavior

This motoko class has a default OVS behavior that sends cycles to the developer to provide funding for maintenance and continued development. In accordance with the OVS specification and ICRC85, this behavior may be overridden by another OVS sharing heuristic or turned off. We encourage all users to implement some form of OVS sharing as it helps us provide quality software and support to the community.

Default behavior: 1 XDR per month for up to 100,000 actions;  1 additional XDR per month for each additional 100,000 actions. Max of 10 XDR per month per canister.

Default Beneficiary: Pan Industrial
