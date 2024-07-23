import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AddCanisterRequest {
  'arg' : Uint8Array | number[],
  'initial_cycles' : bigint,
  'wasm_module' : Uint8Array | number[],
  'name' : string,
  'memory_allocation' : [] | [bigint],
  'compute_allocation' : [] | [bigint],
}
export type CanisterAction = { 'Start' : null } |
  { 'Stop' : null };
export interface CanisterIdRecord { 'canister_id' : Principal }
export type CanisterInstallMode = { 'reinstall' : null } |
  { 'upgrade' : null } |
  { 'install' : null };
export interface CanisterStatusResult {
  'status' : CanisterStatusType,
  'memory_size' : bigint,
  'cycles' : bigint,
  'settings' : DefiniteCanisterSettings,
  'idle_cycles_burned_per_day' : [] | [bigint],
  'module_hash' : [] | [Uint8Array | number[]],
  'reserved_cycles' : [] | [bigint],
}
export type CanisterStatusType = { 'stopped' : null } |
  { 'stopping' : null } |
  { 'running' : null };
export interface ChangeCanisterControllersError {
  'code' : [] | [number],
  'description' : string,
}
export interface ChangeCanisterControllersRequest {
  'target_canister_id' : Principal,
  'new_controllers' : Array<Principal>,
}
export interface ChangeCanisterControllersResponse {
  'change_canister_controllers_result' : ChangeCanisterControllersResult,
}
export type ChangeCanisterControllersResult = { 'Ok' : null } |
  { 'Err' : ChangeCanisterControllersError };
export interface ChangeCanisterRequest {
  'arg' : Uint8Array | number[],
  'wasm_module' : Uint8Array | number[],
  'stop_before_installing' : boolean,
  'mode' : CanisterInstallMode,
  'canister_id' : Principal,
  'memory_allocation' : [] | [bigint],
  'compute_allocation' : [] | [bigint],
}
export interface DefiniteCanisterSettings {
  'freezing_threshold' : [] | [bigint],
  'controllers' : Array<Principal>,
  'reserved_cycles_limit' : [] | [bigint],
  'memory_allocation' : [] | [bigint],
  'compute_allocation' : [] | [bigint],
}
export interface StopOrStartCanisterRequest {
  'action' : CanisterAction,
  'canister_id' : Principal,
}
export interface _SERVICE {
  'add_nns_canister' : ActorMethod<[AddCanisterRequest], undefined>,
  'canister_status' : ActorMethod<[CanisterIdRecord], CanisterStatusResult>,
  'change_canister_controllers' : ActorMethod<
    [ChangeCanisterControllersRequest],
    ChangeCanisterControllersResponse
  >,
  'change_nns_canister' : ActorMethod<[ChangeCanisterRequest], undefined>,
  'get_build_metadata' : ActorMethod<[], string>,
  'stop_or_start_nns_canister' : ActorMethod<
    [StopOrStartCanisterRequest],
    undefined
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
