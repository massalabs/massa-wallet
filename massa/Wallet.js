class Wallet
{
    constructor(web3Wallet)
    {
        this.web3Wallet = web3Wallet;
    }

    loadAccounts(accounts)
    {
        this.web3Wallet.setBaseAccount(accounts[0]);
        this.web3Wallet.addAccountsToWallet(accounts);
        //console.log({msg:'set base account', 'account': accounts[0]});
        //console.log({msg:'get base account', 'account': this.web3Wallet.getBaseAccount()});
    }

    getBaseAccount()
    {
        return this.web3Wallet.getBaseAccount();
    }

    setBaseAccount(account)
    {
        return this.web3Wallet.setBaseAccount(account);
    }

    getLastAccount()
    {
        let accounts = this.web3Wallet.getWalletAccounts();
        return accounts.length > 0 ? accounts[accounts.length-1] : null;
    }

    getAccount(address)
    {
        return this.web3Wallet.getWalletAccountByAddress(address);
    }

    getAddresses()
    {
        let accounts = this.web3Wallet.getWalletAccounts();
        return accounts.map((obj) => obj.address);
    }

    //Add new account, or existing account with private key
    async addAccount(privKeyTxt = null)
    {
        //Add account to web3Wallet
        let account;
        if (privKeyTxt == null)
            account = await this.web3Wallet.constructor.walletGenerateNewAccount();
        else
        {
            let accounts = await this.web3Wallet.addPrivateKeysToWallet([privKeyTxt]);
            if (accounts.length > 0)
                account = accounts[accounts.length-1];
            else
                return false;
        }

        return account;
    }

    async addAccountFromBytes(bytes)
    {
        return await this.addAccount(xbqcrypto.deduce_private_base58check(bytes));
    }


    //Sign bytes compact
    signContent(bytesCompact)
    {
        let account = this.getBaseAccount();

        // Parse private key
        let parsed = xbqcrypto.parse_private_base58check(account.privateKey);
        let privKey = Secp256k1.uint256(parsed.privkey, 16);

        // Hash byte compact
        let hash_encoded_data = xbqcrypto.hash_sha256(bytesCompact);
        let digest = Secp256k1.uint256(hash_encoded_data)

        // Sign the digest
        const sig = Secp256k1.ecsign(privKey, digest)
        return xbqcrypto.base58check_encode(xbqcrypto.Buffer.concat([xbqcrypto.Buffer.from(sig.r, "hex"), xbqcrypto.Buffer.from(sig.s, "hex")]))
    }

    //Send transaction
    async sendTransaction(fromAddr, toAddr, amount, fees)
    {
        let fromAccount = this.getAccount(fromAddr);
        return await this.web3Wallet.sendTransaction({
            fee: fees,
            amount: amount,
            recipientAddress: toAddr
        }, fromAccount);
    }

    /* OLD CODE
    
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
    */
}

export default Wallet;