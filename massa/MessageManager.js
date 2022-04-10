import MassaController from './MassaController.js';

let IS_CHROME = /Chrome/.test(navigator.userAgent);
let mybrowser = IS_CHROME ? chrome : browser;

class MessageManager
{
    constructor()
    {
        this.controller = new MassaController();

        //TODO : handle this in a better way
        this.userAnswer = null;
        this.userData = null;
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
        //Signatures
        if (request.action == 'sign_content')
        {
            //Add pending message
            this.controller.addMessage({type: 'signature', content: request.content});

            //Open popup
            //TODO : left and top not working in firefox
            chrome.windows.create({ url: chrome.runtime.getURL("popup/index.html"), type: 
            "popup", height : 700, width : 400/*, left: screen.availWidth - 400, top: 0*/ });

            //TODO : handle this in a better way
            this.userAnswer = null;
            this.userData = null;
            this.answerChrome = await new Promise(async (resolve, reject) =>
            {
                while (this.userAnswer === null) // wait till user has answered
                {
                    await this.sleep(100);
                }
                resolve(this.userData); // return html of the pageToLoad
            });
            return this.answerChrome;
        }

        if (request.action == 'get_pending_messages')
        {
            this.answerChrome = this.controller.pendingMessages; 
            return this.answerChrome;
        }

        if (request.action == 'message_result')
        {
            if (request.message.type == 'signature')
            {
                this.userAnswer = request.answer;
                if (this.userAnswer)
                    this.userData = this.controller.signContent(request.message.content);

                this.controller.removeMessage(request.messageIndex);
            }
        }


        //ZIP
        if (request.action == 'get_zip_file')
        {
            this.answerChrome = await this.controller.getZipFile(request.site);
            return this.answerChrome;
        }
        

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

    async sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default MessageManager;