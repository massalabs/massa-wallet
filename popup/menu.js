$(document).ready(() => new PopupController());

class PopupController
{
    constructor()
    {
        //Classes
        this.network = new Network();
        this.wallet = new Wallet(this.network);

        //Wallet addresses container
        this.walletContainer = $("#wallet_addresses");

        //Transaction form
        this.selectFrom = $('#from_addr');
        this.inputTo = $('#to_addr');
        this.inputAmount = $('#amount');
        this.inputFees = $('#fees');
        this.btnSend = $('#send_transaction');

        this.initEvents();

        this.load();
    }

    async load()
    {
        await this.network.loadNetwork();
        $('#select_network').val(this.network.currentNetwork);

        await this.wallet.loadAccounts();
        this.updateWallet();
    }

    initEvents()
    {
        //Network change
        let selectNetWork = $('#select_network');
        selectNetWork.change(() =>
        {
            this.network.setNetwork(selectNetWork.val());
            this.updateBalances();
        })

        //New Address add
        let addAddress = $('#add_address');
        addAddress.click( () =>
        {
            if (this.wallet.addAccount())
                this.updateWallet();
        });

        //Existing Address add
        let keyInput = $('[name=priv_key]');
        let addKey = $('#add_key');
        addKey.click( () =>
        {
            let key = keyInput.val();
            console.log(key);
            if (key)
            {
                try { 
                    if (this.wallet.addAccount(key)) 
                        this.updateWallet(); 
                }
                catch(e) { console.log(e); alert('invalid key'); }
            }
            else alert('invalid key')
        });

        //Send transaction
        this.btnSend.click(async () =>
        {
            console.log('click');
            this.btnSend.prop('disabled', true);
            let from = this.selectFrom.children('option[selected]').text();
            let to = this.inputTo.val();
            let amount = this.inputAmount.val();
            let fees = this.inputFees.val();

            let latestPeriod;
            try {
                latestPeriod = await this.network.getLatestPeriod() + 5;
            }
            catch(e) { alert('error getting last period'); console.error(e); return; }

            let res = await this.wallet.send(from, to, amount, fees, latestPeriod);
            this.btnSend.prop('disabled', false);
        });
    }

    updateWallet()
    {
        this.walletContainer.children().remove();
        this.selectFrom.children().remove();

        let i = 0;
        for (let address in this.wallet.accounts)
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

            //Add adress to transaction 'from' select
            this.selectFrom.append('<option value="' + i + '"' + (i==0 ?' selected' : '') + '>' + address + '</option>');
            i++;
        }

        this.updateBalances();
    }

    updateBalances()
    {
        var reqval = [];
        
        for (let address in this.wallet.accounts)
            reqval.push(address);
        
        //Get balances
        if (reqval.length == 0)
            return;

        this.network.request('get_addresses', [reqval], (resJson) =>
        {
            for (let i = 0; i < resJson.length; i++) 
            {
                let addr = resJson[i].address;
                let balance = resJson[i].ledger_info.final_ledger_info.balance;
                let candidateBalance = resJson[i].ledger_info.candidate_ledger_info.balance;
                var balancefield = $('#wallet_line_' + addr + ' .wallet_balance');
                if (balancefield.length == 0)
                    continue;

                let balanceStr = balance;
                if (candidateBalance)
                    balance += '(' + candidateBalance + ')';
                balancefield.html(balanceStr)
            }
        }, () =>
        {
            console.error('error getting balances');
        });
    }

    initWalletLine(line, address)
    {
        line.find('.wallet_copy_addr').click(() =>
        {
            let copyText = $('<textarea></textarea');
            copyText.val(address);
            $('body').append(copyText);
            copyText.get(0).select();
            document.execCommand('copy');
            //navigator.clipboard.writeText(copyText.val());
            copyText.remove();

            alert ('address copied (' + address + ')');
        });

        line.find('.wallet_send_from').click(() =>
        {
            console.log(line.index());
            this.selectFrom.val(line.index());
        });
    }
}