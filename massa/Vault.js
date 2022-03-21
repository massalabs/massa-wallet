//Vault encryptor
//Loaded as js scripts in background.html :
//import { encryptor } from '/lib/browser-passworder.js';
//import * as bip39 from '/lib/bip39.browser.js';

class Vault
{
    constructor()
    {
        this.password = null;
    }

    init(password)
    {
        this.password = password;
    }

    //Encryption
    async encrypt(dataObj)
    {
        return await encryptor.encrypt(this.password, dataObj);
    }
    async decrypt(encrypted)
    {
        return await encryptor.decrypt(this.password, encrypted);
    }
    

    //Mnemonic
    getMnemonic(dataObj)
    {
        return bip39.entropyToMnemonic(dataObj);
    }
    recoverWithMnemonic(mnemonic)
    {
        return bip39.mnemonicToEntropy(mnemonic);
    }
}

export default Vault;