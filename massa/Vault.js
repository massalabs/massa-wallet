//Vault wrapper
class Vault
{
    constructor(web3Vault)
    {
        this.web3Vault = web3Vault;
    }

    cleanVault()
    {
        this.web3Vault.password = null;
        this.web3Vault.mnemonic = null;
    }

    setPassword(password)
    {
        this.web3Vault.setPassword(password);
    }

    init()
    {
        this.web3Vault.init();
    }

    async decryptVault(encrypted)
    {
        let res = await this.web3Vault.decryptVault(encrypted);
        this.web3Vault.mnemonic = res.mnemonic;
        return res;
    }
    
    async encryptVault()
    {
        return await this.web3Vault.encryptVault();
    }

    exportVault()
    {
        return this.web3Vault.exportVault();
    }

    recoverVault(mnemonic)
    {
        this.web3Vault.recoverVault(mnemonic);
    }
}

export default Vault;