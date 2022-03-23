import MassaController from './MassaController.js';

let IS_CHROME = /Chrome/.test(navigator.userAgent);
let mybrowser = IS_CHROME ? chrome : browser;

class MessageManager
{
    constructor()
    {
        this.controller = new MassaController();
    }

    //For chrome
    async onMessage(request, sender, sendResponse)
    {
        let res;
        try {
            res = await this._onMessage(request, sender, sendResponse);
        }
        catch(e)
        {
            console.log(e);
            res = {error : e.toString()};
        }
        if (IS_CHROME)
            sendResponse(res);
        else 
            return res;
    }

    async _onMessage(request, sender, sendResponse)
    {
        if (request.action == 'get_provider')
        {
            this.answerChrome = {provider: this.controller.provider};
            return this.answerChrome;
        }

        if (request.action == 'get_network')
        {
            this.answerChrome = this.controller.getNetwork();
            return this.answerChrome;
        }

        //Other messages are limited within the extension (not the content script)
        let fromMe = sender.tab ? false : true;
        if (!fromMe) return;
        
        //Vault
        if (request.action == 'get_state')
        {
            this.answerChrome = await this.controller.getState();
            return this.answerChrome;
        }

        if (request.action == 'vault_init')
        {
            if (!request.recover)
                await this.controller.addAccount();
            this.answerChrome = await this.controller.initVault(request.password);
            return this.answerChrome;
        }

        if (request.action == 'vault_load')
        {
            this.answerChrome = await this.controller.loadVault(request.password);
            return this.answerChrome;
        }

        if (request.action == 'vault_recover')
        {
            try {
                await this.controller.recoverVault(request.mnemonic);
            }
            catch(e)
            {
                this.answerChrome = {error: 'invalid mnemonic'}; 
                return this.answerChrome;
            }
            this.answerChrome = {};
            return this.answerChrome;
        }

        if (request.action == 'vault_export')
        {
            this.answerChrome = await this.controller.exportVault();
            return this.answerChrome;
        }
        


        //Wallet
        if (request.action == 'wallet_add_account')
        {
            try { 
                let res = await this.controller.addAccount(request.key);
                this.answerChrome = {address: res};
                return this.answerChrome;
            }
            catch(e) { 
                this.answerChrome = {error: 'invalid key'}; 
                return this.answerChrome;
            }
        }

        if (request.action == 'wallet_get_balances')
        {
            let res = await this.controller.getBalances();
            this.answerChrome = {accounts: res};
            return this.answerChrome;
        }

        //Network
        if (request.action == 'network_select')
        {
            let res = await this.controller.setNetwork(request.network);
            this.answerChrome = {};
            return this.answerChrome;
        }

        //Transaction
        if (request.action == 'send_transaction')
        {
            this.answerChrome = await this.controller.sendTransaction(request.params);
            return this.answerChrome;
        }

        this.answerChrome = {'error': 'request unknown', 'request': request};
        return this.answerChrome;
    }
}

export default MessageManager;