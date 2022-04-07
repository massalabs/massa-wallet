class Wallet
{
    constructor(network)
    {
        this.network = network;

        this.accounts = {};
        this.privKeys = [];
    }

    async loadAccounts(privKeys)
    {
        this.accounts = {};
        this.privKeys = [];
        for (let i in privKeys)
            this.addAccount(privKeys[i]);
    }

    getDefaultAccount()
    {
        return this.accounts[Object.keys(this.accounts)[0]];
    }

    hasAccount(addr)
    {
        return this.accounts.hasOwnProperty(addr);
    }

    getAddresses()
    {
        return Object.keys(this.accounts);
    }

    //Add new account, or existing account with private key
    addAccount(privKeyTxt = null)
    {
        let randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
        privKeyTxt = privKeyTxt ? privKeyTxt : xbqcrypto.deduce_private_base58check(randomBytes);

        let account = this._parseKey(privKeyTxt);
        if (this.hasAccount(account.address))
        {
            alert('Address already present in wallet.');
            return false;
        }

        account.bytes = randomBytes;

        this.accounts[account.address] = account;
        this.privKeys.push(privKeyTxt);

        return account.address;
    }

    addAccountFromBytes(bytes)
    {
        let addr = this.addAccount(xbqcrypto.deduce_private_base58check(bytes));
        this.accounts[addr].bytes = bytes;
        return addr;
    }

    //Sign transaction
    signTransaction(transaction) 
    {    
        // Compute bytes compact
        let parsed_fee = parseInt(new Decimal(transaction.content.fee).times(1e9));
        let parsed_amount = parseInt(new Decimal(transaction.content.op.Transaction.amount).times(1e9));
        let encoded_data = xbqcrypto.compute_bytes_compact(parsed_fee, transaction.content.expire_period,
        transaction.content.sender_public_key, 0, transaction.content.op.Transaction.recipient_address, parsed_amount)
    
        return this.signContent(encoded_data);
    }

    //Sign bytes compact
    signContent(bytesCompact)
    {
        //TODO : selected account
        let account = this.getDefaultAccount();

        // Hash byte compact
        let hash_encoded_data = xbqcrypto.hash_sha256(bytesCompact);
            
        // Signing a digest
        let digest = Secp256k1.uint256(hash_encoded_data)
        const sig = Secp256k1.ecsign(account.privkey, digest)
        return xbqcrypto.base58check_encode(xbqcrypto.Buffer.concat([xbqcrypto.Buffer.from(sig.r, "hex"), xbqcrypto.Buffer.from(sig.s, "hex")]))
    }

    //Send amount to another address
    /* TODO : remove
    async send(fromAddr, toAddr, amountStr, feeStr, latestPeriod)
    {
        if (!this.hasAccount(fromAddr))
            return {'error': 'wrong address'}; // should not happen

        let account = this.accounts[fromAddr];

        //Value to send
        let sendamount = null;
        let sendamount_mul = -1;
        try {
            sendamount = new Decimal(amountStr);
            sendamount_mul = sendamount.times(1e9);
        } catch(e) { sendamount_mul = -1; }
        if(isNaN(sendamount_mul) || (sendamount_mul < 0) || (sendamount_mul > (Math.pow(2, 64) - 1)))
            return {'error': 'wrong amount'};

        //Fees
        let sendfee = null;
        let sendfee_mul = -1;
        try {
            sendfee = new Decimal(feeStr);
            sendfee_mul = sendfee.times(1e9);
        } catch(e) { sendamount_mul = -1; }
        if(isNaN(sendfee_mul) || (sendfee_mul < 0) || (sendfee_mul > (Math.pow(2, 64) - 1)))
            return {'error': 'wrong fees'};

        //Send to addr
        let parsed = '';
        let sendtopkh = '';
        try {
            parsed = xbqcrypto.parse_address(toAddr);
            sendtopkh = parsed.pubkeyhash;
        } catch(e) { sendtopkh = '' }

        if (sendtopkh == '')
            return {'error': 'wrong destination address'};

        var trans_infos = ""
            + "From: " +  fromAddr + "<br>"
            + "To: " +  toAddr + "<br>"
            + "Amount: " +  sendamount + " coins<br>"
            + "Fee: " +  sendfee + " coins<br>";

        try {
            var transac = {"content": {"op": {"Transaction": {}}}}

            transac.content["sender_public_key"] = account.b58cpubkey
            transac.content["fee"] = sendfee.toString()
            transac.content["expire_period"] = latestPeriod
            transac.content.op.Transaction["recipient_address"] = toAddr
            transac.content.op.Transaction["amount"] = sendamount.toString()
            
            transac["signature"] = this.signContent(transac, account)
        } catch(e) { 
            return {'error': 'Error while generating transaction: ' + e};
        }


        //Send transaction
        //let resJson = await this.network.request('send_operations', [[transac]]);
        //trans_infos += "Tx: " + resJson[0];
        return trans_infos;
    }*/

    _parseKey(privKeyTxt)
    {
        let account = {b58cprivkey : privKeyTxt};
        
        // Parse private key
        let parsed = xbqcrypto.parse_private_base58check(privKeyTxt);
        account.privkey = Secp256k1.uint256(parsed.privkey, 16);

        // Get public key
        let pubkey = Secp256k1.generatePublicKeyFromPrivateKeyData(account.privkey);
        let pubY = Secp256k1.uint256(pubkey.y, 16)
        let prefix = (pubY.isEven() ? 0x02 : 0x03);
        prefix = xbqcrypto.Buffer.from([prefix], "hex")
        account.pubKey = xbqcrypto.Buffer.concat([prefix, xbqcrypto.Buffer.from(pubkey.x, "hex")])
        
        // Get address
        account.address = xbqcrypto.deduce_address(account.pubKey);
        
        //TODO : what is it for ?
        // Get thread
        account.thread = xbqcrypto.get_address_thread(account.address);
        
        // Get base58check pubkey
        account.b58cpubkey = xbqcrypto.deduce_public_base58check(account.pubKey);

        //console.log(account);

        return account;
    }
}

export default Wallet;