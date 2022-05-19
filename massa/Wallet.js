class Wallet
{
    constructor(web3Wallet)
    {
        this.web3Wallet = web3Wallet;
    }

    cleanWallet()
    {
        this.web3Wallet.cleanWallet();
        if (this.web3Wallet.hasOwnProperty('baseAccount'))
            delete this.web3Wallet.baseAccount;
    }

    loadAccounts(accounts)
    {
        this.web3Wallet.addAccountsToWallet(accounts);
        this.web3Wallet.setBaseAccount(accounts[0]);
    }

    setBaseAccount(account)
    {
        return this.web3Wallet.setBaseAccount(account);
    }

    getLastAccount()
    {
        let accounts = this.web3Wallet.getWalletAccounts();
        return accounts.length > 0 ? accounts[accounts.length-1] : null;
    }

    getAccount(address)
    {
        return this.web3Wallet.getWalletAccountByAddress(address);
    }

    getAddresses()
    {
        let accounts = this.web3Wallet.getWalletAccounts();
        return accounts.map((obj) => obj.address);
    }

    //Add new account, or existing account with private key
    async addAccount(privKeyTxt = null)
    {
        //Add account to web3Wallet
        let account;
        if (privKeyTxt == null)
            account = await this.web3Wallet.constructor.walletGenerateNewAccount();
        else
        {
            let accounts = await this.web3Wallet.addPrivateKeysToWallet([privKeyTxt]);
            if (accounts.length > 0)
                account = accounts[accounts.length-1];
            else
                return false;
        }

        return account;
    }

    async addAccountFromBytes(bytes)
    {
        return await this.addAccount(xbqcrypto.deduce_private_base58check(bytes));
    }

    //Send transaction
    async sendTransactionInternal(fromAddr, toAddr, amount, fees)
    {
        let fromAccount = this.getAccount(fromAddr);
        return await this.web3Wallet.sendTransaction({
            fee: fees,
            amount: amount,
            recipientAddress: toAddr
        }, fromAccount);
    }


    //Wrapped functions (usable by any DAPP)
    async sendTransaction(params, executor)
    {
        return await this.web3Wallet.sendTransaction(params, executor);
    }

    async getBaseAccount()
    {
        let account = this.web3Wallet.getBaseAccount();
        if (account)
        {
            return { address:account.address, publicKey: account.publicKey};
        }
        else
            return account;
    }

    async walletInfo()
    {
        let accounts = await this.web3Wallet.walletInfo();
        let resAccounts = [];
        for (let i = 0; i < accounts.length; i++)
        {
            let resAccount = {};
            for (let prop in accounts[i])
            {
                if (prop != 'privateKey' && prop != 'randomEntropy')
                    resAccount[prop] = accounts[i][prop];
            }
            resAccounts.push(resAccount);
        }
        return resAccounts;
    }

    async getWalletAddressesInfo(params)
    {
        return await this.web3Wallet.getWalletAddressesInfo(params);
    }

    async getAccountSequentialBalance(params)
    {
        return await this.web3Wallet.getAccountSequentialBalance(params);
    }

    async buyRolls(params, executor)
    {
        return await this.web3Wallet.buyRolls(params, executor);
    }

    async sellRolls(params, executor)
    {
        return await this.web3Wallet.sellRolls(params, executor);
    }
}

export default Wallet;