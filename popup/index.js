const IS_CHROME = /Chrome/.test(navigator.userAgent);
const mybrowser = IS_CHROME ? chrome : browser;

const CONFIRM_MESSAGES = {
    'deploySmartContract': {msg: 'Deploy smart contract ?', ok: 'Smart contract deployed with Tx :', cancel: 'Deployment refused'}, 
    'callSmartContract': {msg: 'Call smart contract ?', ok: 'Smart contract called with Tx :', cancel: 'Call refused'}, 
    /*'readSmartContract', 'executeReadOnlySmartContract',*/
    'sendTransaction': {msg: 'Send transaction ?', ok: 'Transaction successful with Tx :', cancel: 'Transaction refused'}, 
    'buyRolls': {msg: 'Buy rolls ?', ok: 'Rolls bought with Tx :', cancel: 'Buy refused'}, 
    'sellRolls': {msg: 'Sell rolls ?', ok: 'Rolls sold with Tx :', cancel: 'Sell refused'}
};

$(document).ready(() => new PopupController());

class PopupController
{
    constructor()
    {
        //Main containers
        this.mainContainer = $('.main_container');
        this.createPasswordContainer = $('.create_password_container');
        this.passwordContainer = $('.password_container');
        this.recoverContainer = $('.recover_container');
        this.baseAccountContainer = $('.wallet_base_account_addr');

        //Network select
        this.selectNetWork = this.mainContainer.find('#select_network');

        //Wallet addresses container
        this.walletContainer = $("#wallet_addresses");

        //Transaction form
        this.selectFrom = $('#from_addr');
        this.inputTo = $('#to_addr');
        this.inputAmount = $('#amount');
        this.inputFees = $('#fees');
        this.btnSend = $('#send_transaction');

        this.recovering = false;
        this.timeOutBalances = null;

        this.initEvents();

        this.initFirstContainer();
    }


    /********************************************************************************************************************************
     * INIT
     ********************************************************************************************************************************/
    initFirstContainer()
    {
        //Check vault
        mybrowser.runtime.sendMessage({action: "get_state"}, (res) =>
        {
            if (res.hasVault)
            {
                if (res.connected)
                {
                    this.mainContainer.show();
                    this.updateWallet(res.addresses, res.baseAccountAddr);
                    this.selectNetWork.val(res.network);
                    this.updateBalances();
                    this.handlePendingMessages();
                }
                else
                    this.passwordContainer.show();
                return;
            }
            
            this.createPasswordContainer.show();
        });
    }

    initEvents()
    {
        this.mainContainer.find('.disconnect_btn').click(() =>
        {
            mybrowser.runtime.sendMessage({action: "disconnect"}, () =>
            {
                this.mainContainer.hide();
                this.passwordContainer.show();
            });
        });

        //Create wallet
        this.createPasswordContainer.find('#wallet_create').click(() =>
        {
            let password1 = this.createPasswordContainer.find('[name=password_1]').val();
            let password2 = this.createPasswordContainer.find('[name=password_2]').val();

            if (password1 != password2)
            {
                Message("passwords don't match", 'Error');
                return;
            }

            //Strong password check
            if (!new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})').test(password1))
            {
                Message(`Password not strong enough :
                <br>-The password must be at least 8 characters long
                <br>-The password must have at least one uppercase letter
                <br>-The password must have at least one lowercase letter
                <br>-The password must have at least one digit (?=.*[0-9])
                <br>-The password must have at least one special character
                `, 'Error');
                return;
            }

            mybrowser.runtime.sendMessage({action: "vault_init", password: password1, recover: this.recovering}, (res) =>
            {
                if (this.handleError(res))
                    return;
                this.recoverContainer.hide();
                this.createPasswordContainer.hide();
                this.mainContainer.show();

                this.selectNetWork.val(res.network);
                this.updateWallet(res.addresses, res.baseAccountAddr);

                this.recovering = false;

                this.updateBalances();

                this.handlePendingMessages();
            });
        });

         //Connect to wallet
         this.passwordContainer.find('#wallet_connect').click(() =>
         {
             let password = this.passwordContainer.find('[name=password]').val();
             mybrowser.runtime.sendMessage({action: "vault_load", password}, (res) =>
             {
                 if (this.handleError(res))
                    return;
                 this.passwordContainer.hide();
                 this.mainContainer.show();
 
                 this.selectNetWork.val(res.network);
                 this.updateWallet(res.addresses, res.baseAccountAddr);

                 this.updateBalances();

                 this.handlePendingMessages();
             });
         });


        //Mnemonic recover
        $('.mnemonic_link').click((e) =>
        {
            e.preventDefault();
            this.recoverContainer.show();
        });

        this.recoverContainer.find("#mnemonic_send").click(() =>
        {
            let mnemonic = this.recoverContainer.find('[name=mnemonic]').val().trim();
            if (mnemonic.split(' ').length != 24)
            {
                Message('You must enter 24 words', 'Error');
                return;
            }

            mybrowser.runtime.sendMessage({action: "vault_recover", mnemonic}, (res) =>
            {
                if (this.handleError(res))
                    return;
                this.passwordContainer.hide();
                this.recoverContainer.hide();
                this.createPasswordContainer.show(); // show 'create new password'

                this.createPasswordContainer.find('#recover_success').show();
                this.createPasswordContainer.find('#wallet_create').html('Recover Wallet');
                this.createPasswordContainer.find('.create_recover').hide();
                this.recovering = true;
            });
        });

        this.mainContainer.find('#export_wallet').click(() =>
        {
            mybrowser.runtime.sendMessage({action: "vault_export"}, (res) =>
            {
                if (this.handleError(res))
                    return;
                let box = Message('<textarea>' + res + '</textarea>', 'Your recover phrase');

                let btns = box.find('.box_buttons');
                let copyBtn = $('<button class="btn">Copier</button>');
                btns.prepend(copyBtn);
                copyBtn.click(() =>
                {
                    this.copyToClipboard(box.find('textarea'));
                    Message('Mnemonic phrase copied', 'Copy done');
                });
            });
        });


        //Network change
        this.selectNetWork.change(() =>
        {
            let network = this.selectNetWork.val();
            mybrowser.runtime.sendMessage({action: "network_select", network}, (res) =>
            {
                if (this.handleError(res))
                    return;

                if (this.timeOutBalances !== null)
                    clearTimeout(this.timeOutBalances);
                this.updateBalances();
            });
        })


        //New Address add
        let addAddress = this.mainContainer.find('#add_address');
        addAddress.click(() =>
        {
            this.onAddAccount();
        });

        //Existing Address add
        let keyInput = this.mainContainer.find('[name=priv_key]');
        let addKey = this.mainContainer.find('#add_key');
        addKey.click( () =>
        {
            let key = keyInput.val();
            if (key.length > 0)
                this.onAddAccount(key);
        });


        //Send transaction
        this.btnSend.click(async () =>
        {
            this.btnSend.prop('disabled', true);
            let from = this.selectFrom.children('option:selected').text();
            let to = this.inputTo.val();
            let amount = this.inputAmount.val();
            let fees = this.inputFees.val();

            mybrowser.runtime.sendMessage({action: "send_transaction", params: {from, to, amount, fees}}, (res) =>
            {
                if (this.handleError(res))
                    return;
                Message(res, 'Transaction successful');
                this.btnSend.prop('disabled', false);
            });
        });

        //TODO : tmp
        //Replace click event on links with massa:// 
        let links = document.querySelectorAll('a');
        for (let i = 0; i < links.length; i++)
        {
            if (links[i].href.substring(0, 8) != 'massa://')
                continue;
            links[i].onclick = function()
            {
                let siteToLoad = this.href.substring(8);
                
                if (links[i].getAttribute('target') == '_blank')
                    chrome.tabs.create({'url' : "/massaweb/opensite.html?url=" + siteToLoad });
                else
                    chrome.tabs.update(undefined, {'url' : "/massaweb/opensite.html?url=" + siteToLoad });
                return false;
            };
        }
    }


    onAddAccount(key = null)
    {
        mybrowser.runtime.sendMessage({action: "wallet_add_account", key}, (res) =>
        {
            if (this.handleError(res))
                return;
            this.addWalletLine(res.address);
        });
    }

    updateBalances()
    {
        mybrowser.runtime.sendMessage({action: "wallet_get_balances"}, (res) =>
        {
            if (this.handleError(res))
            {
                this.timeOutBalances = null;
                return;
            }
            this.onUpdateBalances(res.accounts);
            this.timeOutBalances = setTimeout(() => this.updateBalances(), 5000);
        });
    }

    handleError(res, callBack)
    {
        if (res.error)
        {
            console.log(res);
            if (res.error.indexOf('XMLHttpRequest') >= 0)
            {
                Message("Can't connect to selected network", "Error", callBack);
                return;
            }
            Message(res.error, 'Error', callBack);
            return true;
        }
        return false;
    }


    /********************************************************************************************************************************
     * WALLET
     ********************************************************************************************************************************/
    updateWallet(addresses, baseAccountAddr)
    {
        this.walletContainer.children().remove();
        this.selectFrom.children().remove();

        for (let i in addresses)
            this.addWalletLine(addresses[i]);

        //Set baseAccount
        this.walletContainer.find('#wallet_line_' + baseAccountAddr + ' .wallet_addr').addClass('selected');
        this.baseAccountContainer.html(baseAccountAddr);
    }
    
    onUpdateBalances(accounts)
    {
        for (let i in accounts)
            this.onUpdateBalance(accounts[i]);
    }

    onUpdateBalance(account)
    {
        let balanceStr = account.balance;
        if (account.candidateBalance)
            balanceStr += '(' + account.candidateBalance + ')';

        
        let balancefield = this.walletContainer.find('#wallet_line_' + account.address + ' .wallet_balance');
        balancefield.html(balanceStr);
    }


    //Wallet DOM
    addWalletLine(address)
    {
        let line = 
        $('<div class="wallet_line" id="wallet_line_' + address + '">' 
            + '<div class="wallet_addr">' + address + '</div>'
            + '<div class="wallet_balance">---</div>'
            + '<div class="wallet_actions">'
                + '<div class="wallet_copy_addr" title="copy address"></div>'
                + '<div class="wallet_send_from" title="send from this address"></div>'
            + '</div>'
        + '</div>');
    
        //Add wallet line
        this.walletContainer.append(line);
        this.initWalletLine(line, address);

        //Add address to transaction 'from' select
        let index = this.selectFrom.children().length;
        this.selectFrom.append('<option value="' + index + '"' + (index==0 ?' selected' : '') + '>' + address + '</option>');
    }

    initWalletLine(line, address)
    {
        line.find('.wallet_addr').click(() =>
        {
            line.parent().find('.wallet_addr').removeClass('selected');
            line.find('.wallet_addr').addClass('selected');
            this.baseAccountContainer.html(address);

            mybrowser.runtime.sendMessage({action: "wallet_set_base_account", address});
        });

        line.find('.wallet_copy_addr').click(() =>
        {
            let copyText = $('<textarea></textarea');
            copyText.val(address);
            $('body').append(copyText);
            this.copyToClipboard(copyText);
            //navigator.clipboard.writeText(copyText.val()); // doesn't work : 'window not focused' error
            copyText.remove();

            Message (address, 'Address copied to clipboard');
        });

        line.find('.wallet_send_from').click(() =>
        {
            this.selectFrom.val(line.index());
        });
    }

    copyToClipboard(textarea)
    {
        textarea.get(0).select();
        document.execCommand('copy');
        //navigator.clipboard.writeText(textarea.val()); // doesn't work : 'window not focused' error
    }


    //Messaging
    handlePendingMessages(hadMessages = false)
    {
        mybrowser.runtime.sendMessage({action: "get_pending_messages"}, async (res) =>
        {
            if (this.handleError(res))
            {
                return;
            }
            //Show pending messages
            if (res.length > 0)
            {
                await this.handlePendingMessage(res[0], 0);

                //show next message is any
                this.handlePendingMessages(true);
            }
            //Close pop up after handling messages
            else if (hadMessages)
                window.close();
        });
    }

    async handlePendingMessage(message, messageIndex)
    {
        return new Promise((resolve) =>
        {
            let confirmMessage = CONFIRM_MESSAGES[message.type];
            if (typeof(confirmMessage) == 'undefined')
            {
                Message ('message not implemented for : ' + message.type, resolve);
                return;
            }

            //Add an executor selector and send it to the controller
            let executorSelector = '<div class="executor_selector">Executor: <select>';
            let baseAddr = this.baseAccountContainer.text();
            this.selectFrom.children('option').each(function()
            {
                executorSelector += '<option' + (this.innerText == baseAddr ? ' selected' : '') +'>' + this.innerHTML + '</option>';
            });
            executorSelector += '</select></div>';
            let box = AskConfirm(confirmMessage.msg + executorSelector + this.jsonToHtml(message.params), (agree) =>
            {
                let executor = box.find('.executor_selector select option:selected').text();
                mybrowser.runtime.sendMessage({action: "message_result", answer: agree, msgId: message.msgId, messageIndex, executor}, (res) =>
                {
                    if (res && this.handleError(res, resolve))
                        return;
                    
                    let box = Message(agree ? confirmMessage.ok + '<br>' + this.jsonToHtml(res, true) : confirmMessage.cancel, resolve);
                    let oThis = this;
                    box.find('.json_copy_tx').click(function()
                    {
                        oThis.copyToClipboard($(this).prev());
                    });
                });
            });
        });
    }

    //Convert json to readable html
    jsonToHtml(json, withCopy = false)
    {
        let html = '<div class="json_values">';

        for (let prop in json)
        {
            let val = json[prop];
            if (prop == 'contractDataBase64')
            {
                prop = 'contractLength';
                val = val.length;
            }

            let copyBtn = false;
            let isTx = false;
            if (parseInt(prop) != prop)
                html += '<span>' + prop + ':</span>';
            else
            {
                copyBtn = withCopy;
                isTx = val.length > 24;
            }

            html += '<textarea ' + (isTx?'class="tx"':'') + '>' + val + '</textarea>';
            if (copyBtn)
                html += '<div class="json_copy_tx" title="copy tx"></div>';
            html += '<br>';
        }

        html += '</div>';
        return html;
    }
}