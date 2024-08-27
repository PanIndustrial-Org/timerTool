import { Principal } from "@dfinity/principal";
import type { Identity } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';

import { IDL } from "@dfinity/candid";

import {
  PocketIc,
  createIdentity,
} from "@hadronous/pic";

import type {
  Actor,
  CanisterFixture
} from "@hadronous/pic";



import {idlFactory as timersIDLFactory,
  init as timerInit } from "../../src/declarations/timer/timer.did.js";
import type {
  _SERVICE as TimerService,
  Action,
  ActionId,
  ActionRequest,
  Args,
  Stats } from "../../src/declarations/timer/timer.did.d";
export const sub_WASM_PATH = ".dfx/local/canisters/timer/timer.wasm";


import {idlFactory as collectorIDLFactory,
  init as collectorInit } from "../../src/declarations/collector/collector.did.js";
import type {
  _SERVICE as CollectorService
 } from "../../src/declarations/collector/collector.did.d";
export const collector_WASM_PATH = ".dfx/local/canisters/collector/collector.wasm";

import type {
  _SERVICE as NNSLedgerService,
  Account,
  Icrc1TransferResult

} from "../../src/declarations/nns-ledger/nns-ledger.did.d";
import {
  idlFactory as nnsIdlFactory,
} from "../../src/declarations/nns-ledger/nns-ledger.did.js";


let pic: PocketIc;

let timer_fixture: CanisterFixture<TimerService>;
let nnsledger: Actor<NNSLedgerService>;

const NNS_SUBNET_ID =
  "erfz5-i2fgp-76zf7-idtca-yam6s-reegs-x5a3a-nku2r-uqnwl-5g7cy-tqe";
const nnsLedgerCanisterId = Principal.fromText(
    "ryjl3-tyaaa-aaaaa-aaaba-cai"
  );

const NNS_STATE_PATH = "pic/nns_state/node-100/state";

const admin = createIdentity("admin");
const alice = createIdentity("alice");
const bob = createIdentity("bob");
const serviceProvider = createIdentity("serviceProvider");
const OneDay = BigInt(86400000000000); // 24 hours in NanoSeconds
const OneMinute = BigInt(60000000000); // 1 minute in Nanoseconds

const base64ToUInt8Array = (base64String: string): Uint8Array => {
  return Buffer.from(base64String, 'base64');
};

const minterPublicKey = 'Uu8wv55BKmk9ZErr6OIt5XR1kpEGXcOSOC1OYzrAwuk=';
const minterPrivateKey =
  'N3HB8Hh2PrWqhWH2Qqgr1vbU9T3gb1zgdBD8ZOdlQnVS7zC/nkEqaT1kSuvo4i3ldHWSkQZdw5I4LU5jOsDC6Q==';

const minterIdentity = Ed25519KeyIdentity.fromKeyPair(
  base64ToUInt8Array(minterPublicKey),
  base64ToUInt8Array(minterPrivateKey),
);

async function awardTokens(actor: Actor<NNSLedgerService>, caller: Identity,  fromSub: Uint8Array | null, to: Account, amount: bigint) : Promise<Icrc1TransferResult> {
  actor.setIdentity(caller);
  let result = await actor.icrc1_transfer({
    memo: [],
    amount: amount,
    fee: [],
    from_subaccount: fromSub ? [fromSub] : [],
    to: to,
    created_at_time: [],
  });
  console.log("transfer result", result);
  return result;
};


describe("test timers", () => {
  beforeEach(async () => {
    

    pic = await PocketIc.create(process.env.PIC_URL, {
      
      nns: {
          fromPath: NNS_STATE_PATH,
          subnetId: Principal.fromText(NNS_SUBNET_ID),
      },
      system: 1,
      application:1
    });

    await pic.setTime(new Date(2024, 1, 30).getTime());
    //await pic.setTime(new Date(2024, 7, 10, 17, 55,33).getTime());
    await pic.tick();
    await pic.tick();
    await pic.tick();
    await pic.tick();
    await pic.tick();
    await pic.advanceTime(1000 * 5);

    let systemSubnets = pic.getSystemSubnets();
    console.log("pic system", systemSubnets);

    await pic.resetTime();
    await pic.tick();

    const subnets = pic.getApplicationSubnets();

    //targetSubnetId: subnets[0].id,
    console.log(Principal.fromText("q26le-iqaaa-aaaam-actsa-cai"));

    timer_fixture = await pic.setupCanister<TimerService>({
      //targetCanisterId: Principal.fromText("q26le-iqaaa-aaaam-actsa-cai"),
      idlFactory: timersIDLFactory,
      wasm: sub_WASM_PATH,
      //targetSubnetId: subnets[0].id,
      arg: IDL.encode(timerInit({IDL}), [[]]),
    });
    
    nnsledger = await pic.createActor<NNSLedgerService>(
      nnsIdlFactory,
      nnsLedgerCanisterId
    );

});


  afterEach(async () => {
    await pic.tearDown();
  });
  
  it(`can call hello world`, async () => {
    timer_fixture.actor.setIdentity(admin);

    const hello = await timer_fixture.actor.hello();

    await pic.tick();

    console.log("got", hello);

    expect(hello).toBe(BigInt(60000000000));
  });

  it(`can create an approval`, async () => {

    await awardTokens(nnsledger, minterIdentity, null, {owner : alice.getPrincipal(), subaccount : []}, BigInt(10000000000));

    await pic.tick();


    // Set the identity to Alice to act on her behalf
    timer_fixture.actor.setIdentity(alice);
    nnsledger.setIdentity(alice);

  
    // Approve a transfer
    const approvalResult = await nnsledger.icrc2_approve({
        from_subaccount: [],
        spender: {
            owner: timer_fixture.canisterId,
            subaccount: []
        },
        amount: BigInt(10000000000000000),
        memo: [],
        created_at_time: [BigInt((await pic.getTime()) * 1000000)],
        expected_allowance: [],
        expires_at: [],
        fee: [BigInt(10000)]
    });

    console.log("approval result", approvalResult);

    expect(approvalResult).toMatchObject({ Ok: expect.any(BigInt) });
    // Forward time 
    await pic.advanceTime(86400000); // 24 hours in milliseconds
    await pic.tick();

  });


  // Initialization and State Management
  it(`initializes with initial state when stored is null`, async () => {

    console.log("initializing with null state");
    const timerToolFixture = await pic.setupCanister<TimerService>({
      idlFactory: timersIDLFactory,
      wasm: sub_WASM_PATH,
      arg: IDL.encode(timerInit({IDL}), [[]]),
    });
    let thisTime = BigInt(Math.floor((await pic.getTime()))) * 1000000n;

    //ensure initialization runs
    await pic.setTime(Number(( thisTime)/BigInt(1000000)) + 1); 
    console.log("advancing clock to ", (await pic.getTime()));
    await pic.tick();

    console.log("initializing with null state should have run");

    // Fetch the current state from the TimerTool canister
    const currentState = await timerToolFixture.actor.get_stats();

    // We fetch what the initial state should look like from a fresh initialization
    const expectedInitialState : Stats  = {
      timers : BigInt(0),
      nextTimer : [],
      lastExecutionTime : BigInt(0),
      expectedExecutionTime : [],
      nextActionId : BigInt(0),
      minAction : [],
      maxExecutions : BigInt(10),
      cycles : 999999998847740188n,
    };

    // Assert that the fetched current state matches the expected initial state
   
    expect(currentState.timers).toEqual(expectedInitialState.timers);
    expect(currentState.nextTimer).toEqual(expectedInitialState.nextTimer);
    expect(currentState.lastExecutionTime).toEqual(expectedInitialState.lastExecutionTime);
    expect(currentState.expectedExecutionTime).toEqual(expectedInitialState.expectedExecutionTime);
    expect(currentState.nextActionId).toEqual(expectedInitialState.nextActionId);
    expect(currentState.minAction).toEqual(expectedInitialState.minAction);
  });


it(`initializes with provided state`, async () => {
  // Define initial state for the TimerTool

  let thisTime = BigInt(Math.floor((await pic.getTime()))) * 1000000n;

  console.log("this time", thisTime);

  const timer1Id : ActionId = {
    time: thisTime + BigInt(100000000000), 
    id: BigInt(2)
  };
  const timer1Action: Action = {
    actionType: "test1", 
    params: new Uint8Array([0,1,2,3]),
    retries: 0n,
    aSync: []
  };

  const initialState : Args = [{
      initialTimers: [
        [timer1Id,timer1Action],
        [{time: BigInt(thisTime) + BigInt(300000000000), id: BigInt(3)}, {actionType: "test2", params: new Uint8Array([5,6,7,8]), retries: 0n, aSync: []}]
      ],
      lastExecutionTime: BigInt(thisTime) + BigInt(2),
      expectedExecutionTime: BigInt(thisTime) + BigInt(10),
      nextActionId : BigInt(4),
      nextCycleActionId: [],
      lastActionIdReported: [],
      lastCycleReport: [],
      maxExecutions: [100n]
    }];

  // Creating the TimerTool canister with the provided initial state
  const timerToolWithState = await pic.setupCanister<TimerService>({
    idlFactory: timersIDLFactory,
    wasm: sub_WASM_PATH,
    arg: IDL.encode(timerInit({IDL}), [initialState]),
  });

  //ensure initialization runs
  await pic.setTime(Number(( thisTime)/BigInt(1000000)) + 1); 
  console.log("advancing clock to ", (await pic.getTime()));
  await pic.tick();

  // Fetching the state from the initialized TimerTool canister to verify 
  const currentState = await timerToolWithState.actor.get_stats();

  console.log("current state with init", currentState);

  // We define what the expected state should look like
  const expectedState = {
    timers: BigInt(2), // as per our input
    nextTimer: [BigInt(2)], // as per our input, assuming encoding matches the type from the Timer service
    lastExecutionTime: BigInt(thisTime) + BigInt(2),
    expectedExecutionTime: [BigInt(thisTime) + BigInt(100000000000)],
    nextActionId: BigInt(4),
    cycles: 999999998846923019n,
    maxExecutions: BigInt(100),
    minAction: [[{id: 2n, time: thisTime + BigInt(100000000000)}, {
      aSync: [],
      actionType: "test1",
      params: new Uint8Array([0,1,2,3]),
      retries: 0n
    }]]

  };

  // Asserting that the fetched state matches the expected state initialized earlier
  expect(currentState.timers).toEqual(expectedState.timers);
  expect(currentState.nextTimer).toEqual(expectedState.nextTimer);
  expect(currentState.lastExecutionTime).toEqual(expectedState.lastExecutionTime);
  expect(currentState.expectedExecutionTime).toEqual(expectedState.expectedExecutionTime);
  expect(currentState.nextActionId).toEqual(expectedState.nextActionId);
  expect(currentState.minAction).toEqual(expectedState.minAction);
  expect(currentState.maxExecutions).toEqual(expectedState.maxExecutions);

});


it(`sets an action correctly and schedules timer`, async () => {
  const timer_fixture = await pic.setupCanister<TimerService>({
    idlFactory: timersIDLFactory,
    wasm: sub_WASM_PATH,
    arg: IDL.encode(timerInit({IDL}), [[]]),
  });

  // Define a sample time and action
  let thisTime = BigInt(Number(Math.floor((await pic.getTime())))) * BigInt(1000000);
  let testActionTime = thisTime + OneMinute;
  let testActionTime2 = thisTime + (OneMinute * 10n);

  const testAction = {
      actionType: "inc",
      params: new Uint8Array(IDL.encode([IDL.Nat], [42]))
  };

  //testAction 2 should not run, but should be scheduled by the end of the test
  const testAction2 = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [84]))
  };

  // Set the identity if needed (e.g., admin)
  timer_fixture.actor.setIdentity(admin);

  // Set an action and expect a scheduled timer
  const addActionResult = await timer_fixture.actor.add_action(testActionTime, testAction);

  console.log("addActionResult", addActionResult);

  const addActionResult2 = await timer_fixture.actor.add_action(testActionTime2, testAction2);

  console.log("addActionResult2", addActionResult2);

  expect(addActionResult.actionId.id).toBe(BigInt(0));
  expect(addActionResult.currentCounter).toBe(BigInt(0));

  expect(addActionResult2.actionId.id).toBe(BigInt(1));
  expect(addActionResult2.currentCounter).toBe(BigInt(0));

  console.log("advancing clock to ", Number(( testActionTime)/BigInt(1000000)) - 10000);

  // Advance the PocketIC time just before the scheduled task
  await pic.setTime(Number(( testActionTime)/BigInt(1000000)) - 10000); 
  console.log("advancing clock to ", (await pic.getTime()));
  await pic.tick();
  console.log("tic1 ", (await pic.getTime()));
  //nothing should happen
  await pic.tick();
  console.log("tick2 ", (await pic.getTime()));


  const stats1 = await timer_fixture.actor.get_stats();

  console.log("stats1", stats1);
  expect(stats1.nextActionId).toBe(BigInt(2));
  expect(stats1.expectedExecutionTime[0]).toBe(thisTime + OneMinute);
  expect(stats1.lastExecutionTime).toBe(0n);


  await pic.setTime(Number((thisTime + OneMinute)/BigInt(1000000)) + 10000); 
  await pic.tick();
  //action should run
  await pic.tick();


  let execTime = BigInt(Number(Math.floor((await pic.getTime())))) * BigInt(1000000);


  // Query the timer stats to confirm a timer is scheduled
  const stats = await timer_fixture.actor.get_stats();

  console.log("stats", stats);
  
  // Check if there is an upcoming timer and the time is correctly set
  expect(stats.lastExecutionTime).toBeGreaterThan(thisTime + OneMinute);
  expect(stats.nextActionId).toBe(BigInt(2)); //`increments nextActionId after setting an action`
  expect(stats.expectedExecutionTime.length).toBe(1);
  expect(stats.expectedExecutionTime[0]).toBe(testActionTime2);
  expect(stats.lastExecutionTime).toBe(execTime);

  const counter = await timer_fixture.actor.get_counter();

  expect(counter).toBe(42n);
});

it(`sets a specific action correctly and schedules timer`, async () => {
  const timer_fixture = await pic.setupCanister<TimerService>({
    idlFactory: timersIDLFactory,
    wasm: sub_WASM_PATH,
    arg: IDL.encode(timerInit({IDL}), [[]]),
  });

  // Define a sample time and action
  let thisTime = BigInt(Number(Math.floor((await pic.getTime())))) * BigInt(1000000);
  let testActionTime = thisTime + OneMinute;
  let testActionTime2 = thisTime + (OneMinute * 10n);

  const testAction = {
      actionType: "specific",
      params: new Uint8Array(IDL.encode([IDL.Nat], [42]))
  };

  //testAction 2 should not run, but should be scheduled by the end of the test
  const testAction2 = {
    actionType: "specific",
    params: new Uint8Array(IDL.encode([IDL.Nat], [84]))
  };

  // Set the identity if needed (e.g., admin)
  timer_fixture.actor.setIdentity(admin);

  // Set an action and expect a scheduled timer
  const addActionResult = await timer_fixture.actor.add_action(testActionTime, testAction);

  console.log("addActionResult", addActionResult);

  const addActionResult2 = await timer_fixture.actor.add_action(testActionTime2, testAction2);

  console.log("addActionResult2", addActionResult2);

  expect(addActionResult.actionId.id).toBe(BigInt(0));
  expect(addActionResult.currentCounter).toBe(BigInt(0));

  expect(addActionResult2.actionId.id).toBe(BigInt(1));
  expect(addActionResult2.currentCounter).toBe(BigInt(0));

  console.log("advancing clock to ", Number(( testActionTime)/BigInt(1000000)) - 10000);

  // Advance the PocketIC time just before the scheduled task
  await pic.setTime(Number(( testActionTime)/BigInt(1000000)) - 10000); 
  console.log("advancing clock to ", (await pic.getTime()));
  await pic.tick();
  console.log("tic1 ", (await pic.getTime()));
  //nothing should happen
  await pic.tick();
  console.log("tick2 ", (await pic.getTime()));


  const stats1 = await timer_fixture.actor.get_stats();

  console.log("stats1", stats1);
  expect(stats1.nextActionId).toBe(BigInt(2));
  expect(stats1.expectedExecutionTime[0]).toBe(thisTime + OneMinute);
  expect(stats1.lastExecutionTime).toBe(0n);


  await pic.setTime(Number((thisTime + OneMinute)/BigInt(1000000)) + 10000); 
  await pic.tick();
  //action should run
  await pic.tick();


  let execTime = BigInt(Number(Math.floor((await pic.getTime())))) * BigInt(1000000);


  // Query the timer stats to confirm a timer is scheduled
  const stats = await timer_fixture.actor.get_stats();

  console.log("stats", stats);
  
  // Check if there is an upcoming timer and the time is correctly set
  expect(stats.lastExecutionTime).toBeGreaterThan(thisTime + OneMinute);
  expect(stats.nextActionId).toBe(BigInt(2)); //`increments nextActionId after setting an action`
  expect(stats.expectedExecutionTime.length).toBe(1);
  expect(stats.expectedExecutionTime[0]).toBe(testActionTime2);
  expect(stats.lastExecutionTime).toBe(execTime);

  const counter = await timer_fixture.actor.get_counter();

  expect(counter).toBe(42n);
});

it(`handles setAction with immediate past time correctly`, async () => {
  // Determine the current simulation time
  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);

  // Define an action with a past timestamp (1 minute before the current time)
  let pastTime = currentTime - BigInt(60 * 1000000); // 60 seconds * 1 million microseconds per second


  console.log("times", currentTime, pastTime);

  const pastAction: ActionRequest = {
    actionType: "inc", // Assuming an actionType that matches what the canister expects
    params: new Uint8Array(IDL.encode([IDL.Nat], [5])) // Increment by 5, adjust with actual encoder
  };

  // Expected to be handled gracefully: either scheduled immediately or rejected with a specific error handling
  const actionResult = await timer_fixture.actor.add_action(pastTime, pastAction);

  console.log("Add action result with past time:", actionResult);

  // Optionally, confirm a specific response or state change that indicates
  // the action was handled (like a specific error message or a check that the action
  // is scheduled to run immediately).

  // Since this test is for past time handling, we might focus on state or error responses,
  // depending on how setAction is designed to handle past timestamps.

  // For example, checking if the action is in the queue with expected timestamp adjustments
  const stats = await timer_fixture.actor.get_stats();
  console.log("Timer stats after setting past time action:", stats);

  // These assertions depend on how the system is expected to handle this:
  expect(actionResult.actionId).toBeDefined();  // Check if an actionId was returned
  // This might change depending on whether past actions are executed immediately or deferred
  expect(stats.expectedExecutionTime[0]).toBeGreaterThanOrEqual(pastTime);  // Check if execution time is updated appropriately

  await pic.tick();

  console.log("pic ran");

  const counter = await timer_fixture.actor.get_counter();

  expect(counter).toBe(5n);


});

it(`correctly cancels an existing timer when a new timer is set`, async () => {
  // Define a sample time for the initial action
  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);
  let futureTime = currentTime + OneMinute; // 1 minute later

  let overwriteTime = currentTime + (OneMinute * 10n); // 1 minute later

  // Define two actions
  const initialAction: ActionRequest = {
    actionType: "testAction",
    params: new Uint8Array(IDL.encode([IDL.Nat], [1]))
  };

  const newAction: ActionRequest = {
    actionType: "testAction",
    params: new Uint8Array(IDL.encode([IDL.Nat], [2]))
  };

  // Set an initial action which starts a timer
  const initialResult = await timer_fixture.actor.add_action(overwriteTime, initialAction);

  console.log("initialResult", initialResult);

  expect(initialResult.actionId.id).toBeDefined();

  const initialStats = await timer_fixture.actor.get_stats();
  expect(initialStats.timers).toBe(1n);
  expect(initialStats.expectedExecutionTime[0]).toBe(overwriteTime);

  // Set a new action before the first one triggers
  const newResult = await timer_fixture.actor.add_action(futureTime, newAction);
  expect(newResult.actionId.id).toBeDefined();
  const newStats = await timer_fixture.actor.get_stats();

  console.log("newResult", newResult);
  // Check that the initial timer is canceled and replaced by the new timer only
  expect(newStats.timers).toBe(2n);
  expect(newStats.expectedExecutionTime[0]).toBe(futureTime);

  //it(`removes action post execution`, async () => {});

  await pic.setTime(Number((futureTime)/BigInt(1000000)) + 10000);

  await pic.tick();

  const newStats2 = await timer_fixture.actor.get_stats();

  expect(newStats2.timers).toBe(1n);
  expect(newStats2.expectedExecutionTime[0]).toBe(overwriteTime);


});

it(`processes multiple actions based on maxExecutions setting`, async () => {
  await timer_fixture.actor.update_max_executions(2n);

  // Assume maxExecutions is set to 2 and we add 3 actions
  const action1: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [10]))
  };
  const action2: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [20]))
  };
  const action3: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [30]))
  };

  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);

  await timer_fixture.actor.add_action(currentTime + BigInt(1000000000), action1); // 1 second later
  await timer_fixture.actor.add_action(currentTime + BigInt(2000000000), action2); // 2 seconds later
  await timer_fixture.actor.add_action(currentTime + BigInt(3000000000), action3); // 3 seconds later

  await pic.tick();

  await pic.advanceTime(4000); // advance to just past all action times
  await pic.tick(); // process the next tick to trigger actions

  const stats = await timer_fixture.actor.get_stats();
  const counter = await timer_fixture.actor.get_counter();

  // Check the number of processed actions; should only be 2 because of maxExecutions constraint
  expect(stats.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(2000000000)); // Check that we've processed past the second action
  expect(stats.timers).toBe(BigInt(1)); // One action remains unprocessed because of maxExecutions

  expect(counter).toBe(BigInt(30));
});

it(`cancels execution if the item traps and errors are not handled`, async () => {
  //await timer_fixture.actor.update_max_executions(2n);

  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);

  // Assume maxExecutions is set to 2 and we add 3 actions
  const action1: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [10]))
  };
  const action2: ActionRequest = {
    actionType: "trapfor10",
    params: new Uint8Array(IDL.encode([IDL.Nat], [currentTime + (OneMinute * 10n)]))
  };
  const action3: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [30]))
  };

  

  await timer_fixture.actor.add_action(currentTime + BigInt(1000000000), action1); // 1 second later
  await timer_fixture.actor.add_action(currentTime + BigInt(2000000000), action2); // 2 seconds later
  await timer_fixture.actor.add_action(currentTime + BigInt(3000000000), action3); // 3 seconds later

  await pic.tick();

  console.log("advancing 1.001s");

  await pic.advanceTime(1001); // advance to just past all action times
  await pic.tick(); // process the next tick to trigger actions

  const stats = await timer_fixture.actor.get_stats();
  const counter = await timer_fixture.actor.get_counter();

  // Check the number of processed actions; should only be 2 because of maxExecutions constraint
  expect(stats.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); // Check that we've processed past the second action
  expect(stats.timers).toBe(BigInt(2)); // One action remains unprocessed because of maxExecutions
  expect(counter).toBe(BigInt(10));

  console.log("advancing 10s");

  await pic.advanceTime(10000); 
  await pic.tick();

  const stats2 = await timer_fixture.actor.get_stats();
  const counter2 = await timer_fixture.actor.get_counter();

  expect(stats2.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); 
  expect(stats2.timers).toBe(BigInt(2));
  expect(counter2).toBe(BigInt(10));

  console.log("advancing 10s");

  await pic.advanceTime(10000); 
  await pic.tick();

  const stats3 = await timer_fixture.actor.get_stats();
  const counter3 = await timer_fixture.actor.get_counter();

  
  expect(stats3.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); 
  expect(stats3.timers).toBe(BigInt(1)); 
  expect(counter3).toBe(BigInt(10));

  console.log("advancing 10s");

  await pic.advanceTime(10000); 
  await pic.tick();

  const stats4 = await timer_fixture.actor.get_stats();
  const counter4 = await timer_fixture.actor.get_counter();

  expect(stats4.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); 
  expect(stats4.timers).toBe(BigInt(0)); 
  expect(counter4).toBe(BigInt(40));

  console.log("advancing 10s");

  await pic.advanceTime(10000); 
  await pic.tick();

  const stats5 = await timer_fixture.actor.get_stats();
  const counter5 = await timer_fixture.actor.get_counter();

  //just double checking that it doesn't come back again for some reason

  
  expect(stats5.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); 
  expect(stats5.timers).toBe(BigInt(0)); 
  expect(counter5).toBe(BigInt(40));
});


it(`reports and reschedules error if detected`, async () => {
  //await timer_fixture.actor.update_max_executions(2n);

  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);

  // Assume maxExecutions is set to 2 and we add 3 actions
  const action1: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [10]))
  };
  const action2: ActionRequest = {
    actionType: "delay.1.minute",
    params: new Uint8Array(IDL.encode([IDL.Nat], [20]))
  };
  const action3: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [30]))
  };

  await timer_fixture.actor.add_action(currentTime + BigInt(1000000000), action1); // 1 second later
  await timer_fixture.actor.add_action(currentTime + BigInt(2000000000), action2); // 2 seconds later
  await timer_fixture.actor.add_action(currentTime + BigInt(3000000000), action3); // 3 seconds later

  await pic.tick();

  console.log("advancing 1.001s");

  await pic.advanceTime(1001); // advance to just past all action times
  await pic.tick(); // process the next tick to trigger actions

  const stats = await timer_fixture.actor.get_stats();
  const counter = await timer_fixture.actor.get_counter();

  // Check the number of processed actions; should only be 2 because of maxExecutions constraint
  expect(stats.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); // Check that we've processed past the second action
  expect(stats.timers).toBe(BigInt(2)); // One action remains unprocessed because of maxExecutions
  expect(counter).toBe(BigInt(10));

  console.log("advancing 10s");

  await pic.advanceTime(10000); 
  await pic.tick();
  await pic.tick();
  await pic.tick();

  const stats2 = await timer_fixture.actor.get_stats();
  const counter2 = await timer_fixture.actor.get_counter();

  expect(stats2.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); 
  expect(stats2.timers).toBe(BigInt(1));
  expect(counter2).toBe(BigInt(40));

  console.log("advancing One Minute");

  await pic.advanceTime(60000); 
  await pic.tick();
  await pic.tick();
  await pic.tick();

  const stats3 = await timer_fixture.actor.get_stats();
  const counter3 = await timer_fixture.actor.get_counter();

  
  expect(stats3.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); 
  expect(stats3.timers).toBe(BigInt(0)); 
  expect(counter3).toBe(BigInt(60));

});

it(`can remove an action before it runs`, async () => {
  //await timer_fixture.actor.update_max_executions(2n);

  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);

  // Assume maxExecutions is set to 2 and we add 3 actions
  const action1: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [10]))
  };
  const action2: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [20]))
  };
  const action3: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [30]))
  };

  await timer_fixture.actor.add_action(currentTime + BigInt(1000000000), action1); // 1 second later
  let result2 = await timer_fixture.actor.add_action(currentTime + BigInt(2000000000), action2); // 2 seconds later
  await timer_fixture.actor.add_action(currentTime + BigInt(3000000000), action3); // 3 seconds later

  await pic.tick();

  console.log("advancing 1.001s");

  await pic.advanceTime(1001); // advance to just past first action times
  await pic.tick(); // process the next tick to trigger actions
  await pic.tick();

  const stats = await timer_fixture.actor.get_stats();
  const counter = await timer_fixture.actor.get_counter();

  // Check the number of processed actions; should only be 2 because of maxExecutions constraint
  expect(stats.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(1000000000)); // Check that we've processed past the second action
  expect(stats.timers).toBe(BigInt(2)); // One action remains unprocessed because of maxExecutions
  expect(counter).toBe(BigInt(10));


  let remove2 = await timer_fixture.actor.cancel_action(result2.actionId.id); 

  expect(remove2.result[0]).toBe(result2.actionId.id); 

  console.log("advancing 10s");

  await pic.advanceTime(10000); 
  await pic.tick();
  await pic.tick();
  await pic.tick();

  const stats2 = await timer_fixture.actor.get_stats();
  const counter2 = await timer_fixture.actor.get_counter();

  expect(stats2.lastExecutionTime).toBeGreaterThan(currentTime + BigInt(3000000000)); 
  expect(stats2.timers).toBe(BigInt(0));
  expect(counter2).toBe(BigInt(40));

  let remove3 = await timer_fixture.actor.cancel_action(result2.actionId.id); 

  expect(remove3.result.length).toBe(0); 


});

it('timer restarts properly after upgrade', async () => {
  const action: ActionRequest = {
    actionType: "delayedAction", // Example action type
    params: new Uint8Array(IDL.encode([IDL.Nat], [10])) // Arbitrary data
  };

  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);

  // Assume maxExecutions is set to 2 and we add 3 actions
  const action1: ActionRequest = {
    actionType: "inc",
    params: new Uint8Array(IDL.encode([IDL.Nat], [10]))
  };

  await timer_fixture.actor.add_action(currentTime + BigInt(60000000000), action1); // 1 minute later

  console.log("advancing 1.001s");

  await pic.advanceTime(1001); // advance to just past first action times
  await pic.tick(); // process the next tick to trigger actions
  await pic.tick();

  const stats = await timer_fixture.actor.get_stats();
  const counter = await timer_fixture.actor.get_counter();

  expect(stats.timers).toBe(BigInt(1)); // One action remains unprocessed because of maxExecutions
  expect(counter).toBe(BigInt(0));

  // Simulate Canister Upgrade
  await pic.upgradeCanister({ 
    canisterId: timer_fixture.canisterId, 
    wasm: sub_WASM_PATH,
    arg: IDL.encode(timerInit({IDL}), [[]]) });

  // You would probably need to re-initialize or confirm state if needed here, not always necessary
  await pic.tick(); // Advance to trigger any instant side-effects post-upgrade

  await pic.advanceTime(5000); // Advance time by five seconds to ensure timer should have triggered
  await pic.tick();

  const stats2 = await timer_fixture.actor.get_stats();
  const counter2 = await timer_fixture.actor.get_counter();

  expect(stats2.timers).toBe(BigInt(1)); // One action remains unprocessed because of maxExecutions
  expect(counter2).toBe(BigInt(0));

  await pic.advanceTime(65000); // Advance time by five seconds to ensure timer should have triggered
  await pic.tick();
  await pic.tick();
  await pic.tick();

  const stats3 = await timer_fixture.actor.get_stats();
  const counter3 = await timer_fixture.actor.get_counter();

  expect(stats3.timers).toBe(BigInt(0)); // One action remains unprocessed because of maxExecutions
  expect(counter3).toBe(BigInt(10));

});

it('cycle share is processed correctly', async () => {

  let collector_fixture = await pic.setupCanister<CollectorService>({
    idlFactory: collectorIDLFactory,
    wasm: collector_WASM_PATH,
  });

  console.log("collector id is ", collector_fixture.canisterId.toString());
  
  await timer_fixture.actor.update_collector(collector_fixture.canisterId.toString())
  let currentTime = BigInt(Math.floor((await pic.getTime())) * 1000000);

  console.log("advancing one day");

  let firstDay =  currentTime + (OneDay*1n) + OneMinute;
  let thirtyFirstDay =  currentTime + (OneDay*31n) + OneMinute; 

  console.log("setting first Day");

  await pic.setTime(Number(firstDay/1000000n)); // advance to just past first day times
  await pic.tick(); // process the next tick to trigger actions
  await pic.tick();

  const stats0 = await timer_fixture.actor.get_stats();
  console.log("Cycles1", stats0.cycles);

  const id1 = await timer_fixture.actor.get_lastActionIdReported();
  console.log("actionid1", id1);

  await pic.setTime(Number(thirtyFirstDay/1000000n)); // advance to just past first day times
  await pic.tick(); // process the next tick to trigger actions
  await pic.tick();

  const stats = await timer_fixture.actor.get_stats();

  console.log("first cycle share should have run", stats);

  expect(stats.timers).toBe(BigInt(1)); // One action remains unprocessed because of maxExecutions
  expect(stats.nextActionId).toBe(BigInt(2));

  const id2 = await timer_fixture.actor.get_lastActionIdReported();
  console.log("id2", id2);


  // You would probably need to re-initialize or confirm state if needed here, not always necessary
  await pic.tick(); // Advance to trigger any instant side-effects post-upgrade

  let aMonthLater =  currentTime + (OneDay * 31n) + (OneDay * 31n) + OneMinute;
  
  console.log("moving a month in the future");

  await pic.setTime(Number(aMonthLater/1000000n));
  await pic.tick();
  await pic.tick();

  const stats2 = await timer_fixture.actor.get_stats();

  console.log("after stats 2", stats2);

  const id3 = await timer_fixture.actor.get_lastActionIdReported();
  console.log("id3", id3);

  expect(stats2.timers).toBe(BigInt(1)); // One action remains unprocessed because of maxExecutions
  expect(stats2.nextActionId).toBe(BigInt(3));

  await pic.tick();

  // Simulate Canister Upgrade
  await pic.upgradeCanister({ 
    canisterId: timer_fixture.canisterId, 
    wasm: sub_WASM_PATH,
    arg: IDL.encode(timerInit({IDL}), [[]]) });

  let afterUpgrade =  currentTime + (OneDay * 31n) + (OneDay * 31n) + OneMinute + OneDay + OneMinute;

  await pic.tick();
  await pic.tick();


  console.log("moving a month in the future");

  await pic.setTime(Number(afterUpgrade/1000000n));
  
  await pic.tick();

  await pic.tick();

  const stats3 = await timer_fixture.actor.get_stats();

  console.log("after stats 3", stats3);

  const id4 = await timer_fixture.actor.get_lastActionIdReported();
  console.log("id4", id4);

  expect(stats3.timers).toBe(BigInt(1)); // One action remains unprocessed because of maxExecutions
  expect(stats3.nextActionId).toBe(BigInt(3));

});

it('stress test', async () => {


  let currentTime = BigInt(Math.ceil((await pic.getTime())) * 1000000);


  for(let x =0; x<100; x++){
    const action1: ActionRequest = {
      actionType: "inc",
      params: new Uint8Array(IDL.encode([IDL.Nat], [1]))
    };

    await timer_fixture.actor.add_action(currentTime + (OneMinute * BigInt(x) * 2n), action1); // 1 minute later
  };

  console.log("advancing one day");

  for(let x =0; x<100; x++){
    await pic.advanceTime(60000);
    await pic.tick();
  };


  const stats = await timer_fixture.actor.get_stats();
  const counter = await timer_fixture.actor.get_counter();

  console.log("first stats", stats);

  if(counter == 50n){ 
    expect(stats.timers).toBe(BigInt(50));
    expect(stats.nextActionId).toBe(BigInt(100));
  } else {
    expect(stats.timers).toBe(BigInt(49));
    expect(stats.nextActionId).toBe(BigInt(100));
  };


  // Simulate Canister Upgrade
  await pic.upgradeCanister({ 
    canisterId: timer_fixture.canisterId, 
    wasm: sub_WASM_PATH,
    arg: IDL.encode(timerInit({IDL}), [[]]) });

  let afterUpgrade =  currentTime + (OneDay * 31n) + OneMinute + OneDay + OneMinute;

  console.log("moving a month in the future");

  
  await pic.tick();

  await pic.tick();

  const stats3 = await timer_fixture.actor.get_stats();
  const counter3 = await timer_fixture.actor.get_counter();

  console.log("after stats 3", stats3);

  if(counter3 == 50n){ 
    expect(stats3.timers).toBe(BigInt(50));
    expect(stats3.nextActionId).toBe(BigInt(100));
  } else {
    expect(stats3.timers).toBe(BigInt(49));
    expect(stats3.nextActionId).toBe(BigInt(100));
  };

  for(let x =100; x<200; x++){
    const action1: ActionRequest = {
      actionType: "inc",
      params: new Uint8Array(IDL.encode([IDL.Nat], [1]))
    };

    await timer_fixture.actor.add_action(currentTime + (OneMinute * BigInt(x) * 2n), action1); // 1 minute later
  };

  console.log("advancing one day");

  for(let x =100; x<200; x++){
    await pic.advanceTime(60000);
    await pic.tick();
  };

  const stats4 = await timer_fixture.actor.get_stats();
  const counter4 = await timer_fixture.actor.get_counter();

  console.log("after stats 4", stats4);

  if(counter4 == 100n){ 
    expect(stats4.timers).toBe(BigInt(100));
    expect(stats4.nextActionId).toBe(BigInt(200));
  } else {
    expect(stats4.timers).toBe(BigInt(99));
    expect(stats4.nextActionId).toBe(BigInt(200));
  };

  




});



  
});
