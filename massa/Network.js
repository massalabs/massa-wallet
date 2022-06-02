const NETWORK_LOCAL = 0;
const NETWORK_LABNET = 1;
const NETWORK_TESTNET = 2;
const NETWORK_MAINNET = 3;

const NETWORK_ADDRESS = ['http://localhost:33035', 'https://labnet.massa.net/api/v2', 'https://test.massa.net/api/v2', 'https://massa.net/api/v2'];


const MASSA_DNS = "29s67VyX7KMUSwZqdqMUnhCm4PX5EaScTYYTnpw98Fwb9JCYah";
const MASSA_WEB = "2dzzGMAmBTMjYHRSszHGa3QYVTUVLoKzgsqmYizKGnsuhpoLud";


class Network
{
    constructor()
    {
        this.currentNetwork = NETWORK_TESTNET;
        this.networkAddress = NETWORK_ADDRESS[this.currentNetwork];

        this.web3Client = massa.ClientFactory.createDefaultClient(this.networkAddress);
    }

    setDefaultNetwork()
    {
        this.setNetwork(NETWORK_LABNET);
    }

    setNetwork(network)
    {
        this.currentNetwork = network;
        this.networkAddress = NETWORK_ADDRESS[this.currentNetwork];
        this.web3Client.setNewDefaultProvider(this.networkAddress);
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


    async getZipFile(site)
    {
        //Get site address
        let site_encoded = xbqcrypto.base58check_encode(xbqcrypto.hash_sha256('record'+site));
        let json_response = await this.web3Client.publicApi().getAddresses([MASSA_DNS]);

        //console.log(json_response);
        //console.log(json_response[0]['final_sce_ledger_info']['datastore'][site_encoded]);
        //console.log(json_response[0]['candidate_sce_ledger_info']['datastore']);

        let site_address = String.fromCharCode(...json_response[0]['candidate_sce_ledger_info']['datastore'][site_encoded]);

        //Get zip
        json_response = await this.web3Client.publicApi().getAddresses([site_address]);

        //console.log(json_response[0]['candidate_sce_ledger_info']['datastore']);

        var zip_base64 = "";
        for(var i = 0; i < json_response[0]['candidate_sce_ledger_info']['datastore'][MASSA_WEB].length; ++i){
            zip_base64 += (String.fromCharCode(json_response[0]['candidate_sce_ledger_info']['datastore'][MASSA_WEB][i]));
        }
        
        return zip_base64;
    }

    //Wrapped functions (usable by any DAPP)
    async getAddresses(params)
    {
        return await this.web3Client.publicApi().getAddresses(params);
    }
    async getBlocks(params)
    {
        return await this.web3Client.publicApi().getBlocks(params);
    }
    async getOperations(params)
    {
        return await this.web3Client.publicApi().getOperations(params);
    }
}

export default Network;