import MassaProvider from './MassaProvider.js';
import Network from './Network.js';
import Wallet from './Wallet.js';
import Vault from './Vault.js';
import Storage from './Storage.js';

class MassaController
{
    constructor()
    {
        //Classes
        this.provider = new MassaProvider();
        this.network = new Network();
        this.wallet = new Wallet(this.network);
        this.vault = new Vault();

        //State
        this.connected = false;
        this.mnemonic = '';
    }

    //Vault
    async getState()
    {
        let vault = await Storage.get('vault');
        let addresses = this.wallet.getAddresses();
        return {'hasVault' : vault !== null && typeof(vault) !== undefined, 'connected': this.connected, addresses };
    }

    async initVault(password)
    {
        this.vault.init(password);

        let addresses = this.wallet.getAddresses();        

        this.connected = true;
        if (this.mnemonic == '')
            this.mnemonic = this.vault.getMnemonic(this.wallet.accounts[addresses[0]].bytes);

        this.network.init(this.wallet.accounts[addresses[0]], this.network.currentNetwork);

        await this.saveVault();

        return { network: this.network.currentNetwork, addresses };
    }

    async loadVault(password)
    {
        this.vault.init(password);

        let encrypted = await Storage.get('vault');
        
        let dataObj;
        try {
            dataObj = await this.vault.decrypt(encrypted);
        }
        catch(e)
        {
            return {'error' : e.toString()};
        }
        this._onVaultLoaded(dataObj);

        let addresses = this.wallet.getAddresses();

        this.connected = true;
        return { network: this.network.currentNetwork, addresses};
    }

    async recoverVault(mnemonic)
    {
        let bytes = Buffer.from(this.vault.recoverWithMnemonic(mnemonic), 'hex');
        this.wallet.addAccountFromBytes(bytes);
        this.mnemonic = mnemonic;
    }

    async exportVault()
    {
        return this.mnemonic;
    }

    async saveVault()
    {
        let dataObj = {
            network: this.network.currentNetwork,
            privKeys: this.wallet.privKeys,
            mnemonic: this.mnemonic,
        }
        let encrypted = await this.vault.encrypt(dataObj);
        await Storage.set('vault', encrypted);
    }

    _onVaultLoaded(dataObj)
    {
        this.wallet.loadAccounts(dataObj.privKeys);
        this.network.init(this.wallet.getDefaultAccount(), dataObj.network);
        this.mnemonic = dataObj.mnemonic;
    }


    //Wallet
    async addAccount(privKeyTxt = null)
    {
        let address;

        //Get new address from previous one (allow to recover multiple addresses with one mnemonic)
        if (privKeyTxt === null && this.wallet.privKeys.length > 0)
        {
            let bytes = xbqcrypto.hash_sha256(this.wallet.privKeys[this.wallet.privKeys.length-1]);
            address = this.wallet.addAccountFromBytes(bytes);
        }
        else
            address = this.wallet.addAccount(privKeyTxt);

        if (this.connected)
            await this.saveVault();

        return address;
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

    getNetwork()
    {
        return this.network.networkAddress;
    }

    //Transaction
    async sendTransaction(params)
    {
        let latestPeriod;
        try {
            latestPeriod = await this.network.getLatestPeriod() + 5;
        }
        catch(e) { console.error(e); return {error: 'error getting last period'}; }

        //console.log(params);

        let fromAccount = this.wallet.accounts[params.from];
        let res;
        try {
            res = await this.network.sendTransaction(fromAccount, params.to, params.amount, params.fees, latestPeriod);
        }
        catch(e) { console.error(e); return {error: 'error sending transaction'}; }

        //let res = await this.wallet.send(params.from, params.to, params.amount, params.fees, latestPeriod);
        //console.log(res);

        var trans_infos = ""
            + "From: " +  params.from + "<br>"
            + "To: " +  params.to + "<br>"
            + "Amount: " +  params.amount + " coins<br>"
            + "Fee: " + params.fees + " coins<br>"
            + "Tx: " + res[0];
        return trans_infos;
    }

    async sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default MassaController;