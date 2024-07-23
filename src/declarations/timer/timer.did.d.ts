import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Action {
  'aSync' : [] | [bigint],
  'actionType' : string,
  'params' : Uint8Array | number[],
  'retries' : bigint,
}
export type ActionDetail = [ActionId, Action];
export interface ActionId { 'id' : bigint, 'time' : Time }
export interface ActionId__1 { 'id' : bigint, 'time' : Time }
export interface ActionRequest {
  'actionType' : string,
  'params' : Uint8Array | number[],
}
export type Args = [] | [
  {
    'nextCycleActionId' : [] | [bigint],
    'maxExecutions' : [] | [bigint],
    'nextActionId' : bigint,
    'lastActionIdReported' : [] | [bigint],
    'lastCycleReport' : [] | [bigint],
    'initialTimers' : Array<[ActionId, Action]>,
    'expectedExecutionTime' : Time,
    'lastExecutionTime' : Time,
  }
];
export interface Stats {
  'timers' : bigint,
  'maxExecutions' : bigint,
  'minAction' : [] | [ActionDetail],
  'cycles' : bigint,
  'nextActionId' : bigint,
  'nextTimer' : [] | [TimerId],
  'expectedExecutionTime' : [] | [Time],
  'lastExecutionTime' : Time,
}
export type Time = bigint;
export type TimerId = bigint;
export interface TimerTool {
  '__timer_tool_init_' : ActorMethod<[], undefined>,
  'add_action' : ActorMethod<
    [bigint, ActionRequest],
    {
      'timerStats' : Stats,
      'currentCounter' : bigint,
      'actionId' : ActionId__1,
    }
  >,
  'add_action_async' : ActorMethod<
    [bigint, ActionRequest],
    {
      'timerStats' : Stats,
      'currentCounter' : bigint,
      'actionId' : ActionId__1,
    }
  >,
  'cancel_action' : ActorMethod<
    [bigint],
    {
      'result' : [] | [bigint],
      'timerStats' : Stats,
      'currentCounter' : bigint,
    }
  >,
  'get_counter' : ActorMethod<[], bigint>,
  'get_stats' : ActorMethod<[], Stats>,
  'hello' : ActorMethod<[], bigint>,
  'hello_world' : ActorMethod<[], string>,
  'incremote' : ActorMethod<[bigint], undefined>,
  'trap' : ActorMethod<[], undefined>,
  'update_collector' : ActorMethod<[string], undefined>,
  'update_max_executions' : ActorMethod<[bigint], undefined>,
}
export interface _SERVICE extends TimerTool {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
