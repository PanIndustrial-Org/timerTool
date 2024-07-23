export const idlFactory = ({ IDL }) => {
  const AddCanisterRequest = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'initial_cycles' : IDL.Nat64,
    'wasm_module' : IDL.Vec(IDL.Nat8),
    'name' : IDL.Text,
    'memory_allocation' : IDL.Opt(IDL.Nat),
    'compute_allocation' : IDL.Opt(IDL.Nat),
  });
  const CanisterIdRecord = IDL.Record({ 'canister_id' : IDL.Principal });
  const CanisterStatusType = IDL.Variant({
    'stopped' : IDL.Null,
    'stopping' : IDL.Null,
    'running' : IDL.Null,
  });
  const DefiniteCanisterSettings = IDL.Record({
    'freezing_threshold' : IDL.Opt(IDL.Nat),
    'controllers' : IDL.Vec(IDL.Principal),
    'reserved_cycles_limit' : IDL.Opt(IDL.Nat),
    'memory_allocation' : IDL.Opt(IDL.Nat),
    'compute_allocation' : IDL.Opt(IDL.Nat),
  });
  const CanisterStatusResult = IDL.Record({
    'status' : CanisterStatusType,
    'memory_size' : IDL.Nat,
    'cycles' : IDL.Nat,
    'settings' : DefiniteCanisterSettings,
    'idle_cycles_burned_per_day' : IDL.Opt(IDL.Nat),
    'module_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'reserved_cycles' : IDL.Opt(IDL.Nat),
  });
  const ChangeCanisterControllersRequest = IDL.Record({
    'target_canister_id' : IDL.Principal,
    'new_controllers' : IDL.Vec(IDL.Principal),
  });
  const ChangeCanisterControllersError = IDL.Record({
    'code' : IDL.Opt(IDL.Int32),
    'description' : IDL.Text,
  });
  const ChangeCanisterControllersResult = IDL.Variant({
    'Ok' : IDL.Null,
    'Err' : ChangeCanisterControllersError,
  });
  const ChangeCanisterControllersResponse = IDL.Record({
    'change_canister_controllers_result' : ChangeCanisterControllersResult,
  });
  const CanisterInstallMode = IDL.Variant({
    'reinstall' : IDL.Null,
    'upgrade' : IDL.Null,
    'install' : IDL.Null,
  });
  const ChangeCanisterRequest = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'wasm_module' : IDL.Vec(IDL.Nat8),
    'stop_before_installing' : IDL.Bool,
    'mode' : CanisterInstallMode,
    'canister_id' : IDL.Principal,
    'memory_allocation' : IDL.Opt(IDL.Nat),
    'compute_allocation' : IDL.Opt(IDL.Nat),
  });
  const CanisterAction = IDL.Variant({ 'Start' : IDL.Null, 'Stop' : IDL.Null });
  const StopOrStartCanisterRequest = IDL.Record({
    'action' : CanisterAction,
    'canister_id' : IDL.Principal,
  });
  return IDL.Service({
    'add_nns_canister' : IDL.Func([AddCanisterRequest], [], []),
    'canister_status' : IDL.Func(
        [CanisterIdRecord],
        [CanisterStatusResult],
        [],
      ),
    'change_canister_controllers' : IDL.Func(
        [ChangeCanisterControllersRequest],
        [ChangeCanisterControllersResponse],
        [],
      ),
    'change_nns_canister' : IDL.Func([ChangeCanisterRequest], [], []),
    'get_build_metadata' : IDL.Func([], [IDL.Text], ['query']),
    'stop_or_start_nns_canister' : IDL.Func(
        [StopOrStartCanisterRequest],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
