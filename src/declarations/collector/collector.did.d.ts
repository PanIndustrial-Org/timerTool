import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type BlockIndex = bigint;
export interface Collector {
  'icrc85_deposit_cycles' : ActorMethod<
    [ShareArgs],
    { 'Ok' : bigint } |
      { 'Err' : ShareCycleError }
  >,
  'icrc85_deposit_cycles_notify' : ActorMethod<[ShareArgs], undefined>,
  'wallet_withdraw' : ActorMethod<[bigint, [] | [Principal]], DepositResult>,
}
export interface DepositResult {
  'balance' : bigint,
  'block_index' : BlockIndex,
}
export type ShareArgs = Array<{ 'share' : bigint, 'namespace' : string }>;
export type ShareCycleError = { 'NotEnoughCycles' : [bigint, bigint] } |
  { 'CustomError' : { 'code' : bigint, 'message' : string } };
export interface _SERVICE extends Collector {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
