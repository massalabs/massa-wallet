class Wallet
{
    constructor(network)
    {
        this.network = network;
        this.accounts = {};

        this.privKeys = [];
    }

    async loadAccounts()
    {
        let res = await Storage.get('privKeys');
        if (res)
        {
            this.privKeys = res;
            for (let i in this.privKeys)
                this.addAccount(this.privKeys[i], false);
        }
    }

    hasAccount(addr)
    {
        return this.accounts.hasOwnProperty(addr);
    }

    //Add new account, or existing account with private key
    addAccount(privKeyTxt = null, save = true)
    {
        privKeyTxt = privKeyTxt ? privKeyTxt : xbqcrypto.deduce_private_base58check(window.crypto.getRandomValues(new Uint8Array(32)));

        let account = this._parseKey(privKeyTxt);
        if (this.hasAccount(account.address))
        {
            alert('Address already present in wallet.');
            return false;
        }

        this.accounts[account.address] = account;
        
        //Save key in storage
        if (save)
        {
            this.privKeys.push(privKeyTxt);
            Storage.set('privKeys', this.privKeys);
        }
        return true;
    }

    //Sign content
    signContent(transaction, account) 
    {    
        // Compute bytes compact
        let parsed_fee = parseInt(new Decimal(transaction.content.fee).times(1e9));
        let parsed_amount = parseInt(new Decimal(transaction.content.op.Transaction.amount).times(1e9));
        let encoded_data = xbqcrypto.compute_bytes_compact(parsed_fee, transaction.content.expire_period,
        transaction.content.sender_public_key, 0, transaction.content.op.Transaction.recipient_address, parsed_amount)
    
        // Hash byte compact
        let hash_encoded_data = xbqcrypto.hash_sha256(encoded_data)
    
        // Signing a digest
        let digest = Secp256k1.uint256(hash_encoded_data)
        const sig = Secp256k1.ecsign(account.privkey, digest)
        return xbqcrypto.base58check_encode(xbqcrypto.Buffer.concat([xbqcrypto.Buffer.from(sig.r, "hex"), xbqcrypto.Buffer.from(sig.s, "hex")]))
    }

    //Send amount to another address
    async send(fromAddr, toAddr, amountStr, feeStr, latestPeriod)
    {
        if (!this.hasAccount(fromAddr))
        {
            alert('wrong address'); // should not happen
            return false;
        }

        let account = this.accounts[fromAddr];

        //Value to send
        let sendamount = null;
        let sendamount_mul = -1;
        try {
            sendamount = new Decimal(amountStr);
            sendamount_mul = sendamount.times(1e9);
        } catch(e) { sendamount_mul = -1; }
        if(isNaN(sendamount_mul) || (sendamount_mul < 0) || (sendamount_mul > (Math.pow(2, 64) - 1)))
        {
            alert('wrong amount');
            return false;
        }

        //Fees
        let sendfee = null;
        let sendfee_mul = -1;
        try {
            sendfee = new Decimal(feeStr);
            sendfee_mul = sendfee.times(1e9);
        } catch(e) { sendamount_mul = -1; }
        if(isNaN(sendfee_mul) || (sendfee_mul < 0) || (sendfee_mul > (Math.pow(2, 64) - 1)))
        {
            alert('wrong fees');
            return false;
        }

        //Send to addr
        let parsed = '';
        let sendtopkh = '';
        try {
            parsed = xbqcrypto.parse_address(toAddr);
            sendtopkh = parsed.pubkeyhash;
        } catch(e) { sendtopkh = '' }

        if (sendtopkh == '')
        {
            alert('wrong destination address');
            return false;
        }

        var confirm_message = "Transaction summary:\n"
            + "\tFrom: " +  fromAddr + "\n"
            + "\tTo: " +  toAddr + "\n"
            + "\tAmount: " +  sendamount + " coins\n"
            + "\tFee: " +  sendfee + " coins\n"
            + "\nPlease confirm this transaction.";
        
        if (!confirm(confirm_message))
            return false;

        try {
            var transac = {"content": {"op": {"Transaction": {}}}}

            transac.content["sender_public_key"] = account.b58cpubkey
            transac.content["fee"] = sendfee.toString()
            transac.content["expire_period"] = latestPeriod
            transac.content.op.Transaction["recipient_address"] = toAddr
            transac.content.op.Transaction["amount"] = sendamount.toString()
            
            transac["signature"] = this.signContent(transac, account)
        } catch(e) { alert('Error while generating transaction: ' + e); return false; }


        //Send transaction
        return new Promise((resolve, reject) => 
        {
            this.network.request('send_operations', [[transac]], 
            (resJson) =>
            {
                let res = false;
                if(Array.isArray(resJson)) {
                    alert('Transaction was successfully sent:\n' + resJson[0]);
                    res = true;
                }
                else {
                    alert('An error occured while sending the transaction. Transaction not sent.');
                }
                resolve(res);
            },
            (err) =>
            {
                alert('An error occured while sending the transaction. Transaction not sent.');
                console.error(err);
                resolve(false);
            });
        })
    }

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


/*
        // Generating private key
        const privateKey = Secp256k1.uint256(privateKeyBuf, 16)

        // Generating public key
        const publicKey = Secp256k1.generatePublicKeyFromPrivateKeyData(privateKey)
        const pubX = Secp256k1.uint256(publicKey.x, 16)
        const pubY = Secp256k1.uint256(publicKey.y, 16)


        // Signing a digest
        const digest = Secp256k1.uint256("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", 16)
        const sig = Secp256k1.ecsign(privateKey, digest)
        const sigR = Secp256k1.uint256(sig.r,16)
        const sigS = Secp256k1.uint256(sig.s,16)

        // Verifying signature
        const isValidSig = Secp256k1.ecverify(pubX, pubY, sigR, sigS, digest)
        console.assert(isValidSig === true, 'Signature must be valid')

        */
}