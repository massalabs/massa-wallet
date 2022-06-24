# Massa wallet

Massa's plugin for Chrome and Firefox.

## Installation

- Download the extension using git: `git clone https://github.com/massalabs/massa-wallet` or as a [zip](https://github.com/massalabs/massa-wallet/archive/refs/heads/main.zip).

- Install the extension
  - Chrome:
    - Type chrome://extensions in the adress bar
    - Click on "Load Unpacked"
    - Select the massa-wallet folder

  - Firefox:
    - Type about:debugging in the adress bar
    - Click on "This Firefox"
    - Click on "Load Temporary Add-on..."
    - Select the file `manifest.json` in the massa-wallet folder

## Usage

Once the extension is installed, you should see the Massa icon on the top right of your browser.

The functionallity are :
- Create you wallet (first use)
- Connect to your wallet (later use)
- Get you mnemonic passphrase
- Recover your wallet with your mnemonic
- Add more accounts
- Send transactions
- Explore massa:// websites

N.B : The password is currently auto-filled to simplify the tests (DefaultP@ssword123).


## Injected window.massa

The Web Extension inject a window.massa object for DAPP developpers.

To access its methods, you need to enable it first.
```javascript
window.massa.enable(true);
```

This class is a wrapper of massa-web3 library (https://github.com/massalabs/massa-web3)

It contains 3 subdomains : public(), wallet() and contract().

### window.massa.public()

This is used to access to public functionnalities of the web3 library. The methods are :

-   `getAddresses` (https://github.com/massalabs/massa/wiki/api#get_addresses)
    ```javascript
    const addressesResp = await window.massa.public().getAddresses(["2GcahavufBH9tqVH6SjkSCPXRbqpiCwwSfwFAf3veKiJmiHubK"]);
    ```

-   `getBlocks` (https://github.com/massalabs/massa/wiki/api#get_block)
    ```javascript
    const blocks = await window.massa.public().getBlocks(["nKifcnGbd9zu8nu1hb94XEmMGwgoWbjj3DutzrobeHDdUtEuM"]);
    ```

-   `getOperations` (https://github.com/massalabs/massa/wiki/api#get_operations)
    ```javascript
    const operations = await window.massa.public().getOperations(["z1cNsWAdgvoASq5RnN6MRbqqo634RRJbgwV9n3jNx3rQrQKTt"]);
    ```

### window.massa.wallet()

This is used to access to wallet functionnalities. The methods are :

-   `getBaseAccount` : show the user base account (undefined if the user is not connected)
    ```javascript
    const account = await window.massa.wallet().getBaseAccount();
    console.log(account); // Display { address: '...', publicKey: '...' }
    ```

-   `onBaseAccountChanged` : you can bind to this event to get the user base account. It is triggered when the user login or change base account.
    ```javascript
    window.massa.wallet().onBaseAccountChanged((account) =>
    {
        console.log(account); // Display { address: '...', publicKey: '...' }
    });
    ```

-   `walletInfo` : show all wallet info
    ```javascript
    const walletInfo = await window.massa.wallet().walletInfo();
    ```

-   `getWalletAddressesInfo` : show wallet info of the given addresses
    ```javascript
    const walletInfo = await window.massa.wallet().getWalletAddressesInfo(["yKCRYgv5nVDVwqHmTTXXxqqZW7he3bgEDBQ5bPjBxPkuzAte2"]);
    ```

-   `getAccountSequentialBalance`
    ```javascript
    const balance = await window.massa.wallet().getAccountSequentialBalance("yKCRYgv5nVDVwqHmTTXXxqqZW7he3bgEDBQ5bPjBxPkuzAte2");
    ```

-   `sendTransaction`
    ```javascript
    const sendTxIds = await window.massa.wallet().sendTransaction(
    {
        fee: 0, // int
        amount: "1", //MAS
        recipientAddress:
            "yKCRYgv5nVDVwqHmTTXXxqqZW7he3bgEDBQ5bPjBxPkuzAte2",
    });
    ```

-   `buyRolls`
    ```javascript
    const buyRollsIds = await window.massa.wallet().buyRolls(
    {
        fee: 0, // int
        amount: 1, //ROLLS
    });
    ```

-   `sellRolls`
    ```javascript
    const sellRollsIds = await window.massa.wallet().sellRolls(
    {
        fee: 0, // int
        amount: 1, //ROLLS
    });
    ```

Note : `sendTransaction`, `buyRolls` and `sellRolls` will trigger a confirmation popup to the user


### window.massa.contract()

This is used to access to contract functionnalities. The methods are :

-   `deploySmartContract`
    ```javascript
    const txIds = await window.massa.contract().deploySmartContract(
    {
        fee: 0,
        maxGas: 2000000,
        gasPrice: 0,
        coins: 0,
        contractDataBase64: 'anybase64',
    });
    ```

-   `callSmartContract`
    ```javascript
    const txIds = await window.massa.contract().callSmartContract(
    {
        fee: 0,
        gasPrice: 0,
        maxGas: 200000,
        parallelCoins: 0,
        sequentialCoins: 0,
        targetAddress: scAddress,
        functionName: "play",
        parameter: JSON.stringify({index : 1}),
    });
    ```

-   `readSmartContract`
    ```javascript
    const txIds = await window.massa.contract().readSmartContract(
    {
        fee: 0,
        maxGas: 200000,
        simulatedGasPrice: 0,
        targetAddress: scAddress,
        targetFunction: "getGameState",
        parameter: "some_stringified_data",
        callerAddress: baseAccount.address
    });
    ```

-   `getParallelBalance`
    ```javascript
    const balance = await window.massa.contract().getParallelBalance(contractAddress);
    ```

-   `getFilteredScOutputEvents`
    ```javascript
    const eventsFilter = {
        start: {
            period: 0,
            thread: 0,
        } as ISlot,
        end: {
            period: 0,
            thread: 0,
        },
        original_caller_address:
            "9mvJfA4761u1qT8QwSWcJ4gTDaFP5iSgjQzKMaqTbrWCFo1QM",
        original_operation_id: null,
        emitter_address: null,
    };

    const filteredEvents = await window.massa.contract().getFilteredScOutputEvents(eventsFilter);
    ```

-   `getDatastoreEntry`
    ```javascript
    const data = await window.massa.contract().getDatastoreEntry("vWDxmER2ar6mRFgcRqg94iEMYVypUCcRHGV5tjhdiAGqZqEoo", "some_key");
    ```

-   `executeReadOnlySmartContract`
    ```javascript
    const data = await window.massa.contract().executeReadOnlySmartContract(
    {
        fee: 0,
        maxGas: 2000000,
        gasPrice: 0,
        coins: 0,
        contractDataBase64: 'anybase64',
    });
    ```

-   `getOperationStatus`
    ```javascript
    const status = await window.massa.contract().getOperationStatus(deploymentOperationId);
    ```

-   `awaitRequiredOperationStatus`
    ```javascript
    const EOperationStatus = {
        INCLUDED_PENDING: 0,
        AWAITING_INCLUSION: 1,
        FINAL: 2,
        INCONSISTENT: 3,
        NOT_FOUND: 4
    }
    const data = await window.massa.contract().awaitRequiredOperationStatus(deploymentOperationId, EOperationStatus.INCLUDED_PENDING);
    ```

Note : `deploySmartContract` and `callSmartContract` will trigger a confirmation popup to the user
