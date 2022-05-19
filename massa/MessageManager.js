import MassaController from './MassaController.js';

const IS_CHROME = /Chrome/.test(navigator.userAgent);
const mybrowser = IS_CHROME ? chrome : browser;

//Allowed messages that can be sent to the web extension
const DAPP_CALLS = [
    /* public */
    'getAddresses', 'getBlocks', 'getOperations',
    /* contracts */
    'deploySmartContract', 'callSmartContract', 'readSmartContract', 'getParallelBalance',
    'getFilteredScOutputEvents', 'getDatastoreEntry', 'executeReadOnlySmartContract', 
    'getOperationStatus', 'awaitRequiredOperationStatus',
    /* wallet */
    'getBaseAccount', 'walletInfo', 'getWalletAddressesInfo', 'getAccountSequentialBalance', 
    'sendTransaction', 'buyRolls', 'sellRolls'
];

//Calls that require user confirmation (show popup)
const DAPP_CALLS_WITH_CONFIRM = [
    'deploySmartContract', 'callSmartContract', /*'readSmartContract', 'executeReadOnlySmartContract',*/
    'sendTransaction', 'buyRolls', 'sellRolls'
];


class MessageManager
{
    constructor()
    {
        this.controller = new MassaController();
    }

    //Wrapper function to handle Chrome or Firefox messaging system
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
        let fromExtension = false;
        if (IS_CHROME)
            fromExtension = sender.origin === 'chrome-extension://' + chrome.runtime.id;
        else
            fromExtension = sender.envType === 'addon_child' && sender.id === browser.runtime.id;

        //console.log(request);

        //Calls from injected page
        if (DAPP_CALLS.indexOf(request.action) >= 0)
        {
            let needConfirm = DAPP_CALLS_WITH_CONFIRM.indexOf(request.action) >= 0

            if (needConfirm)
            {
                //Add pending message
                let pendingMessage = {type: request.action, params: request.params, msgId: request.msgId};
                this.controller.addMessage(pendingMessage);

                //Open popup (TODO : how to check if already opened?)
                //TODO : left and top not working in firefox
                chrome.windows.create({ url: chrome.runtime.getURL("popup/index.html"), type: 
                "popup", height : 700, width : 400/*, left: screen.availWidth - 400, top: 0*/ });

                //Wait for user response
                pendingMessage.userAnswer = null;
                pendingMessage.userRes = null;
                return await new Promise(async (resolve, reject) =>
                {
                    while (pendingMessage.userAnswer === null) // wait till user has answered
                    {
                        await this.sleep(100);
                    }
                    resolve(pendingMessage.userRes); // return response
                });
            }
            else
            {
                if (typeof(this.controller[request.action]) !== 'function')
                    return {error: 'function not implemented : ' + request.action};

                return await this.controller[request.action](request.params);
            }
        }

        
        //Other messages are limited to the extension itself
        if (!fromExtension)
            return {};

        //Response from user confirmation
        if (request.action == 'message_result')
        {
            let pendingMessage = this.controller.pendingMessages[request.messageIndex];
            if (typeof(pendingMessage) == 'undefined' || pendingMessage.msgId != request.msgId)
                return {error: 'Message already treated'};

            this.controller.removeMessage(request.messageIndex);

            if (request.answer)
            {
                if (typeof(this.controller[pendingMessage.type]) !== 'function')
                    return {error: 'function not implemented : ' + pendingMessage.type};
                
                pendingMessage.userRes = await this.controller[pendingMessage.type](pendingMessage.params, request.executor);
            }

            pendingMessage.userAnswer = request.answer;
            return pendingMessage.userRes;
        }


        //Get current pending messages for the user
        if (request.action == 'get_pending_messages')
        {
            return this.controller.pendingMessages; 
        }

        //ZIP
        if (request.action == 'get_zip_file')
        {
            return await this.controller.getZipFile(request.site);
        }
        

        //Vault
        if (request.action == 'get_state')
        {
            return await this.controller.getState();
        }

        if (request.action == 'vault_init')
        {
            let res = await this.controller.initVault(request.password, request.recover);
            //Send base account to content script
            await this.sendToContentScript({'type': 'web_extension_res', 'msgId': 'base_account_changed', 'response': await this.controller.getBaseAccount()});
            return res;
        }

        if (request.action == 'vault_load')
        {
            let res = await this.controller.loadVault(request.password);
            //Send base account to content script
            await this.sendToContentScript({'type': 'web_extension_res', 'msgId': 'base_account_changed', 'response': await this.controller.getBaseAccount()});
            return res;
        }

        if (request.action == 'vault_recover')
        {
            try {
                this.controller.recoverVault(request.mnemonic);
            }
            catch(e)
            {
                return {error: 'invalid mnemonic'};
            }
            return {};
        }

        if (request.action == 'vault_export')
        {
            return await this.controller.exportVault();
        }
        
        if (request.action == 'disconnect')
        {
            this.controller.disconnect();
            return {};
        }

        //Wallet
        if (request.action == 'wallet_add_account')
        {
            try { 
                let res = await this.controller.addAccount(request.key);
                if (res === false)
                    return {error: 'this key is already in wallet'};
                else
                    return {address: res.address};
            }
            catch(e) { 
                return {error: 'invalid key'};
            }
        }

        if (request.action == 'wallet_set_base_account')
        {
            let account = await this.controller.setBaseAccount(request.address);
            //Send message to content script
            await this.sendToContentScript({'type': 'web_extension_res', 'msgId': 'base_account_changed', 'response': account});
            return {};
        }

        if (request.action == 'wallet_get_balances')
        {
            let res = await this.controller.getBalances();
            return {accounts: res};
        }

        //Network
        if (request.action == 'network_select')
        {
            await this.controller.setNetwork(request.network);
            return {};
        }

        //Transaction
        if (request.action == 'send_transaction')
        {
            return await this.controller.sendTransactionInternal(request.params);
        }

        return {'error': 'request unknown', 'request': request};
    }

    async sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async sendToContentScript(message)
    {
        let tabList = await mybrowser.tabs.query({});
        for (let tab of tabList) {
            try {
                await mybrowser.tabs.sendMessage(tab.id, message);
            }
            catch(e)
            {
                console.log('can not send to tab ' + tab.id);
            }
        }
    }
}

export default MessageManager;