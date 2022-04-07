let IS_CHROME = /Chrome/.test(navigator.userAgent);
let mybrowser = IS_CHROME ? chrome : browser;

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
        this.timeOutMessages = null;

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
                    this.updateWallet(res.addresses);

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
                this.createPasswordContainer.hide();
                this.mainContainer.show();

                this.selectNetWork.val(res.network);
                this.updateWallet(res.addresses);

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
                 this.updateWallet(res.addresses);

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
            //TODO : the seed is the first private key hash...
            //the next account need to be hash of the first hash to retreive it
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
            let from = this.selectFrom.children('option[selected]').text();
            let to = this.inputTo.val();
            let amount = this.inputAmount.val();
            let fees = this.inputFees.val();

            mybrowser.runtime.sendMessage({action: "send_transaction", params: {from, to, amount, fees}}, (res) =>
            {
                if (this.handleError(res))
                    return;
                Message(res, 'Transaction succesful');
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
            this.onUpdateBalances(res.accounts)
            this.timeOutBalances = setTimeout(() => this.updateBalances(), 5000);
        });
    }

    handleError(res)
    {
        if (res.error)
        {
            console.log(res);
            if (res.error.indexOf('XMLHttpRequest') >= 0)
            {
                Message("Can't connect to selected network", "Error");
                return;
            }
            Message(res.error, 'Error');
            return true;
        }
        return false;
    }


    /********************************************************************************************************************************
     * WALLET
     ********************************************************************************************************************************/
    updateWallet(addresses)
    {
        this.walletContainer.children().remove();
        this.selectFrom.children().remove();

        for (let i in addresses)
            this.addWalletLine(addresses[i]);
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


    handlePendingMessages()
    {
        mybrowser.runtime.sendMessage({action: "get_pending_messages"}, (res) =>
        {
            if (this.handleError(res))
            {
                this.timeOutMessages = null;
                return;
            }
            //Show pending messages
            if (res.length > 0)
            {
                //TODO : show all pending messages
                this.handlePendingMessage(res[0], 0);
            }

            //TODO
            //this.timeOutMessages = setTimeout(() => this.handlePendingMessages(), 5000);
        });
    }

    handlePendingMessage(message, messageIndex)
    {
        if (message.type == 'signature')
        {
            AskConfirm("Sign content ?<br>" + message.content, (res) =>
            {
                mybrowser.runtime.sendMessage({action: "message_result", answer: res, message, messageIndex});
                if (res)
                {
                    Message('signature done');
                }
                else
                    Message('signature refused');
            });
        }
    }
}