import Network from './Network.js';
import Wallet from './Wallet.js';
import Contract from './Contract.js';
import Storage from './Storage.js';
import Vault from './Vault.js';

class MassaController
{
    constructor()
    {
        //Classes
        this.network = new Network();
        this.wallet = new Wallet(this.network.web3Client.wallet());
        this.vault = new Vault(this.network.web3Client.vault());
        this.contract = new Contract(this.network.web3Client.smartContracts());

        //State
        this.connected = false;

        //Notifications/Confirmations
        this.pendingMessages = [];
    }

    //Message
    addMessage(message)
    {
        this.pendingMessages.push(message);
    }

    removeMessage(index)
    {
        this.pendingMessages.splice(index, 1);
    }

    async getState()
    {
        let vault = await Storage.get('vault');
        let addresses = this.wallet.getAddresses();
        let baseAccountAddr = null;
        if (this.connected)
        {
            let baseAccount = await this.wallet.getBaseAccount();
            baseAccountAddr = baseAccount.address;
        }
        return {'hasVault' : vault !== null && typeof(vault) !== undefined, 
            'connected': this.connected, 
            'pending' : this.pendingMessages,
            'network': this.network.currentNetwork,
            'baseAccountAddr': baseAccountAddr,
            addresses };
    }


    //Vault
    async initVault(password, recover)
    {
        //Set password
        this.vault.setPassword(password);

        //Init vault with first account and mnemonic
        if (!recover)
        {
            this.vault.init();
            await this.saveVault();
        }
        
        //Return wallet addresses and selected network
        let addresses = this.wallet.getAddresses();    
        this.connected = true;

        let baseAccount = await this.wallet.getBaseAccount();
        return { 'network': this.network.currentNetwork, 'baseAccountAddr': baseAccount.address, addresses };
    }

    async loadVault(password)
    {
        //Set password
        this.vault.setPassword(password);

        //Decrypt
        let encrypted = await Storage.get('vault');
        let dataObj = await this.vault.decryptVault(encrypted);

        //console.log(dataObj); //TODO : network indexes ar not the same as Network.js
        this.network.setDefaultNetwork();
        //this.network.setNetwork(dataObj.network);
        this.wallet.loadAccounts(dataObj.accounts);

        //Return wallet addresses and selected network
        let addresses = this.wallet.getAddresses();
        this.connected = true;

        let baseAccount = await this.wallet.getBaseAccount();
        return { network: this.network.currentNetwork, 'baseAccountAddr': baseAccount.address, addresses};
    }

    async saveVault()
    {
        let encrypted = await this.vault.encryptVault();
        await Storage.set('vault', encrypted);
    }

    recoverVault(mnemonic)
    {
        this.vault.recoverVault(mnemonic);
    }

    exportVault()
    {
        return this.vault.exportVault().mnemonic;
    }

    disconnect()
    {
        this.wallet.cleanWallet();
        this.vault.cleanVault();
        this.connected = false;
    }

    //Wallet
    async addAccount(privKeyTxt = null)
    {
        let account;

        //Get new address from previous one (allow to recover multiple addresses with one mnemonic)
        let lastAccount = this.wallet.getLastAccount();
        if (privKeyTxt === null && lastAccount !== null)
        {
            let bytes = xbqcrypto.hash_sha256(lastAccount.privateKey);
            account = await this.wallet.addAccountFromBytes(bytes);
        }
        else
        {
            account = await this.wallet.addAccount(privKeyTxt);
        }

        if (account !== false && this.connected)
            await this.saveVault();

        return account;
    }

    async setBaseAccount(address)
    {
        this.wallet.setBaseAccount(this.wallet.getAccount(address));
        return await this.wallet.getBaseAccount();
    }

    async getBalances()
    {
        let accounts = await this.network.getBalances(this.wallet.getAddresses());
        return accounts;
    }


    //Network
    async setNetwork(network)
    {
        this.network.setNetwork(network);

        await this.saveVault();
    }
    
    //Zip
    async getZipFile(site)
    {
        return this.network.getZipFile(site);
    }

    //Wallet
    async sendTransactionInternal(params)
    {
        let res = await this.wallet.sendTransactionInternal(params.from, params.to, params.amount, params.fees);

        var trans_infos = ""
            + "From: " +  params.from + "<br>"
            + "To: " +  params.to + "<br>"
            + "Amount: " +  params.amount + " coins<br>"
            + "Fee: " + params.fees + " coins<br>"
            + "Tx: " + res[0];
        return trans_infos;
    }

    //Public
    async getAddresses(params)
    {
        return await this.network.getAddresses(params)
    }

    async getBlocks(params)
    {
        return await this.network.getBlocks(params)
    }

    async getOperations(params)
    {
        return await this.network.getOperations(params)
    }


    //Wrapped functions (usable by any DAPP)
    //Wallet
    async sendTransaction(params, executor)
    {
        executor = this.wallet.getAccount(executor);
        return await this.wallet.sendTransaction(params, executor);
    }

    async getBaseAccount()
    {
        return await this.wallet.getBaseAccount();
    }

    async walletInfo()
    {
        return await this.wallet.walletInfo();
    }

    async getWalletAddressesInfo(params)
    {
        return await this.wallet.getWalletAddressesInfo(params);
    }

    async getAccountSequentialBalance(params)
    {
        return await this.wallet.getAccountSequentialBalance(params);
    }

    async buyRolls(params, executor)
    {
        executor = this.wallet.getAccount(executor);
        return await this.wallet.buyRolls(params, executor);
    }

    async sellRolls(params, executor)
    {
        executor = this.wallet.getAccount(executor);
        return await this.wallet.sellRolls(params, executor);
    }

    //Contracts
    async deploySmartContract(params, executor)
    {
        executor = this.wallet.getAccount(executor);
        return await this.contract.deploySmartContract(params, executor);
    }

    async callSmartContract(params, executor)
    {
        executor = this.wallet.getAccount(executor);
        return await this.contract.callSmartContract(params, executor);
    }

    async readSmartContract(params)
    {
        return await this.contract.readSmartContract(params);
    }

    async getParallelBalance(params)
    {
        return await this.contract.getParallelBalance(params);
    }

    async getFilteredScOutputEvents(params)
    {
        return await this.contract.getFilteredScOutputEvents(params);
    }

    async getDatastoreEntry(params)
    {
        return await this.contract.getDatastoreEntry(params);
    }

    async executeReadOnlySmartContract(params)
    {
        return await this.contract.executeReadOnlySmartContract(params);
    }

    async getOperationStatus(params)
    {
        return await this.contract.getOperationStatus(params)
    }

    async awaitRequiredOperationStatus(params)
    {
        return await this.contract.awaitRequiredOperationStatus(params);
    }
}

export default MassaController;