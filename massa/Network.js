const NETWORK_LOCAL = 0;
const NETWORK_LABNET = 1;
const NETWORK_TESTNET = 2;
const NETWORK_MAINNET = 3;

const NETWORK_ADDRESS = ['http://localhost:33035', 'http://145.239.66.206:33035', "https://test.massa.net/api/v2", 'https://massa.net/api/v2'];


const MASSA_DNS = "2QsZ5P3oU1w8bTPjxFaFqcBJjTuJDDxV2Y6BuwHuew1kH8rxTP";
const MASSA_WEB = "2dzzGMAmBTMjYHRSszHGa3QYVTUVLoKzgsqmYizKGnsuhpoLud";


class Network
{
    constructor()
    {
        this.currentNetwork = NETWORK_LABNET;
        this.networkAddress = NETWORK_ADDRESS[this.currentNetwork];

        this.currentAccount = null;
        this.web3Client = null;
    }

    init(account, network)
    {
        this.currentNetwork = network;
        this.networkAddress = NETWORK_ADDRESS[this.currentNetwork];
        this.setAccount(account);
    }

    setNetwork(network)
    {
        this.currentNetwork = network;
        this.networkAddress = NETWORK_ADDRESS[this.currentNetwork];
        this.web3Client = ClientFactory.createDefaultClient(this.networkAddress, this.currentAccount);
    }

    setAccount(account)
    {
        this.currentAccount = {
            publicKey: account.b58cpubkey,
            privateKey: account.b58cprivkey,
            address: account.address
        };
        this.web3Client = ClientFactory.createDefaultClient(this.networkAddress, this.currentAccount);
    }

    async getBalances(addresses)
    {
        if (addresses.length == 0) 
            return [];

        const resJson = await this.web3Client.publicApi().getAddresses(addresses);
        let res = [];
        for (let i = 0; i < resJson.length; i++) 
        {
            let address = resJson[i].address;
            let balance = resJson[i].ledger_info.final_ledger_info.balance;
            let candidateBalance = resJson[i].ledger_info.candidate_ledger_info.balance;
            res.push({ address, balance, candidateBalance });
        }
        return res;
    }

    async getLatestPeriod()
    {
        const res = await this.web3Client.publicApi().getNodeStatus();
        return res.last_slot.period;
    }

    async sendTransaction(fromAccount, toAddr, amount, fees)
    {
        const account = {
            publicKey: fromAccount.b58cpubkey,
            privateKey: fromAccount.b58cprivkey,
            address: fromAccount.address
        };

        //TODO : accoutn remove and signContent called 
        return await this.web3Client.wallet().sendTransaction({
            fee: 0,
            amount: 1,
            recipientAddress: toAddr
        }, account);
    }

    async getZipFile(site)
    {
        //Get site address
        let site_encoded = xbqcrypto.base58check_encode(xbqcrypto.hash_sha256('record'+site));
        let json_response = await this.web3Client.publicApi().getAddresses([MASSA_DNS]);

        console.log(json_response);

        let site_address = String.fromCharCode(...json_response[0]['sce_ledger_info']['datastore'][site_encoded]);

        //Get zip
        json_response = await this.web3Client.publicApi().getAddresses([site_address]);
        var zip_base64 = "";
        for(var i = 0; i < json_response[0]['candidate_sce_ledger_info']['datastore']['2dzzGMAmBTMjYHRSszHGa3QYVTUVLoKzgsqmYizKGnsuhpoLud'].length; ++i){
            zip_base64+= (String.fromCharCode(json_response[0]['candidate_sce_ledger_info']['datastore']['2dzzGMAmBTMjYHRSszHGa3QYVTUVLoKzgsqmYizKGnsuhpoLud'][i]));
        }
        let zip_bytes = Uint8Array.from(atob(zip_base64), c => c.charCodeAt(0));
        return zip_bytes;
    }
}

export default Network;