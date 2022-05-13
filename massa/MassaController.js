import Network from './Network.js';
import Wallet from './Wallet.js';
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

        //State
        this.connected = false;

        //Notifications/Confirmations
        this.pendingMessages = [];
    }

    getWeb3Client()
    {
        return this.network.web3Client;
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
        return {'hasVault' : vault !== null && typeof(vault) !== undefined, 
            'connected': this.connected, 
            'pending' : this.pendingMessages,
            'network': this.network.currentNetwork,
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
        return { network: this.network.currentNetwork, addresses };
    }

    async loadVault(password)
    {
        //Set password
        this.vault.setPassword(password);

        //Decrypt
        let encrypted = await Storage.get('vault');
        let dataObj = await this.vault.decryptVault(encrypted);

        //console.log(dataObj);
        this.network.setNetwork(dataObj.network);
        this.wallet.loadAccounts(dataObj.accounts);

        //Return wallet addresses and selected network
        let addresses = this.wallet.getAddresses();
        this.connected = true;
        return { network: this.network.currentNetwork, addresses};
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

    async getBalances()
    {
        let accounts = await this.network.getBalances(this.wallet.getAddresses());
        return accounts;
    }

    signContent(content)
    {
        return this.wallet.signContent(content);
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

    //Transaction
    async sendTransaction(params)
    {
        let res = await this.wallet.sendTransaction(params.from, params.to, params.amount, params.fees);

        var trans_infos = ""
            + "From: " +  params.from + "<br>"
            + "To: " +  params.to + "<br>"
            + "Amount: " +  params.amount + " coins<br>"
            + "Fee: " + params.fees + " coins<br>"
            + "Tx: " + res[0];
        return trans_infos;
    }

    //Useful method
    /*
    async sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }*/
}

export default MassaController;