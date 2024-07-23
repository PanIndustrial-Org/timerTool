export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'upgrade_root' : IDL.Func(
        [
          IDL.Record({
            'wasm_module' : IDL.Vec(IDL.Nat8),
            'module_arg' : IDL.Vec(IDL.Nat8),
            'stop_upgrade_start' : IDL.Bool,
          }),
        ],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
