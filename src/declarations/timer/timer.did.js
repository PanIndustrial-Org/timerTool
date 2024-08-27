export const idlFactory = ({ IDL }) => {
  const Time = IDL.Nat;
  const ActionId = IDL.Record({ 'id' : IDL.Nat, 'time' : Time });
  const Action = IDL.Record({
    'aSync' : IDL.Opt(IDL.Nat),
    'actionType' : IDL.Text,
    'params' : IDL.Vec(IDL.Nat8),
    'retries' : IDL.Nat,
  });
  const Args = IDL.Opt(
    IDL.Record({
      'nextCycleActionId' : IDL.Opt(IDL.Nat),
      'maxExecutions' : IDL.Opt(IDL.Nat),
      'nextActionId' : IDL.Nat,
      'lastActionIdReported' : IDL.Opt(IDL.Nat),
      'lastCycleReport' : IDL.Opt(IDL.Nat),
      'initialTimers' : IDL.Vec(IDL.Tuple(ActionId, Action)),
      'expectedExecutionTime' : Time,
      'lastExecutionTime' : Time,
    })
  );
  const ActionRequest = IDL.Record({
    'actionType' : IDL.Text,
    'params' : IDL.Vec(IDL.Nat8),
  });
  const ActionDetail = IDL.Tuple(ActionId, Action);
  const TimerId = IDL.Nat;
  const Stats = IDL.Record({
    'timers' : IDL.Nat,
    'maxExecutions' : IDL.Nat,
    'minAction' : IDL.Opt(ActionDetail),
    'cycles' : IDL.Nat,
    'nextActionId' : IDL.Nat,
    'nextTimer' : IDL.Opt(TimerId),
    'expectedExecutionTime' : IDL.Opt(Time),
    'lastExecutionTime' : Time,
  });
  const ActionId__1 = IDL.Record({ 'id' : IDL.Nat, 'time' : Time });
  const TimerTool = IDL.Service({
    '__timer_tool_init_' : IDL.Func([], [], []),
    'add_action' : IDL.Func(
        [IDL.Nat, ActionRequest],
        [
          IDL.Record({
            'timerStats' : Stats,
            'currentCounter' : IDL.Nat,
            'actionId' : ActionId__1,
          }),
        ],
        [],
      ),
    'add_action_async' : IDL.Func(
        [IDL.Nat, ActionRequest],
        [
          IDL.Record({
            'timerStats' : Stats,
            'currentCounter' : IDL.Nat,
            'actionId' : ActionId__1,
          }),
        ],
        [],
      ),
    'cancel_action' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Record({
            'result' : IDL.Opt(IDL.Nat),
            'timerStats' : Stats,
            'currentCounter' : IDL.Nat,
          }),
        ],
        [],
      ),
    'get_counter' : IDL.Func([], [IDL.Nat], ['query']),
    'get_lastActionIdReported' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'get_stats' : IDL.Func([], [Stats], ['query']),
    'hello' : IDL.Func([], [IDL.Nat], ['query']),
    'hello_world' : IDL.Func([], [IDL.Text], []),
    'incremote' : IDL.Func([IDL.Nat], [], []),
    'trap' : IDL.Func([], [], []),
    'update_collector' : IDL.Func([IDL.Text], [], []),
    'update_max_executions' : IDL.Func([IDL.Nat], [], []),
  });
  return TimerTool;
};
export const init = ({ IDL }) => {
  const Time = IDL.Nat;
  const ActionId = IDL.Record({ 'id' : IDL.Nat, 'time' : Time });
  const Action = IDL.Record({
    'aSync' : IDL.Opt(IDL.Nat),
    'actionType' : IDL.Text,
    'params' : IDL.Vec(IDL.Nat8),
    'retries' : IDL.Nat,
  });
  const Args = IDL.Opt(
    IDL.Record({
      'nextCycleActionId' : IDL.Opt(IDL.Nat),
      'maxExecutions' : IDL.Opt(IDL.Nat),
      'nextActionId' : IDL.Nat,
      'lastActionIdReported' : IDL.Opt(IDL.Nat),
      'lastCycleReport' : IDL.Opt(IDL.Nat),
      'initialTimers' : IDL.Vec(IDL.Tuple(ActionId, Action)),
      'expectedExecutionTime' : Time,
      'lastExecutionTime' : Time,
    })
  );
  return [Args];
};
