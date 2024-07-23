# Running Pic

To run Pic, you can use the following command from the root of the project. Once there are more tests, adapt the statement to run them all.

npx jest --config pic/jest.config.ts ./pic/timer.test.ts --forceExit

# About State

You'll notice that nns_state.tar.gz is unzipped into the nns_state directory. This is later used to set up Pic and does all the work that dfx nns install and dfx nns import usually does:

```

 const NNS_SUBNET_ID =
  "erfz5-i2fgp-76zf7-idtca-yam6s-reegs-x5a3a-nku2r-uqnwl-5g7cy-tqe";

 const NNS_STATE_PATH = "pic/nns_state/node-100/state";

 pic = await PocketIc.create({
      nns: {
        fromPath: NNS_STATE_PATH,
        subnetId: Principal.fromText(NNS_SUBNET_ID),
      },
      system: 2,
    });

```

The Subnet is unique for each state since this is generated from the local replica and that reseeds the id each time.

See instruction at: https://hadronous.github.io/pic-js/docs/guides/working-with-the-nns/

# General Strategies

Pic.js is great for setting up a multi-subnet environment and getting strict control over that network. You're going to be managing the rounds, cycles, and system time your self so it helps to be explicit and not rely on assumptions.

If a canister needs to call another canister, you may need to run a pic.tick() before everything is going to settle out.

Each Canister gets an actor object hanging off of it an d you can manually set the principal for calling that actor.

```
 cycleOps.actor.setIdentity(admin);
```

Then it is super easy to call that actor.

```
await sub.actor.icrc79_subscribe(data)
```

# Setup and Tear Down

Set up and teardown before each test seems to take a bit of time. You may want to consider a more global set up that allows you not to have to re-deploy essential canisters each time, but may depend on what you are testing(it is still faster than dfx ususally).

# Debugging

I was able to get debugging working in VS Code using the following set up that helped me a number of time:

```

{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasenameNoExtension}",
        "--config",
        "${workspaceFolder}/pic/jest.config.ts",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}

```

# Where are my print lines?

See this post about getting print lines to output to the console. Hopefully this gets added natively:

https://forum.dfinity.org/t/announcing-picjs-typescript-javascript-support-for-pocketic/24479/20?u=skilesare

# Resouces:

- Pic.js - https://github.com/hadronous/pic-js/tree/main
  - There is not a lot of documentation, but generally, reading through https://github.com/hadronous/pic-js/blob/main/packages/pic/src/pocket-ic.ts will give you a good idea of what functions you have available to you.
  - some good examples at https://github.com/hadronous/pic-js/tree/main/examples
