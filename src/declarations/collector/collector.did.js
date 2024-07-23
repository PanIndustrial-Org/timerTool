export const idlFactory = ({ IDL }) => {
  const ShareArgs = IDL.Vec(
    IDL.Record({ 'share' : IDL.Nat, 'namespace' : IDL.Text })
  );
  const ShareCycleError = IDL.Variant({
    'NotEnoughCycles' : IDL.Tuple(IDL.Nat, IDL.Nat),
    'CustomError' : IDL.Record({ 'code' : IDL.Nat, 'message' : IDL.Text }),
  });
  const BlockIndex = IDL.Nat;
  const DepositResult = IDL.Record({
    'balance' : IDL.Nat,
    'block_index' : BlockIndex,
  });
  const Collector = IDL.Service({
    'icrc85_deposit_cycles' : IDL.Func(
        [ShareArgs],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : ShareCycleError })],
        [],
      ),
    'icrc85_deposit_cycles_notify' : IDL.Func([ShareArgs], [], ['oneway']),
    'wallet_withdraw' : IDL.Func(
        [IDL.Nat, IDL.Opt(IDL.Principal)],
        [DepositResult],
        [],
      ),
  });
  return Collector;
};
export const init = ({ IDL }) => { return []; };
