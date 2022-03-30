const NETWORK_LOCAL = 0;
const NETWORK_TESTNET = 1;
const NETWORK_MAINNET = 2;

const NETWORK_ADDRESS = ['http://localhost:33035', "https://test.massa.net/api/v2", 'https://massa.net/api/v2'];

class Network
{
    constructor()
    {
        this.currentNetwork = NETWORK_TESTNET;
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

        //let resJson = await this.request('get_addresses', [addresses]);
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
        //console.log(fromAccount);

        const account = {
            publicKey: fromAccount.b58cpubkey,
            privateKey: fromAccount.b58cprivkey,
            address: fromAccount.address
        };

        //console.log(account);

        return await this.web3Client.wallet().sendTransaction({
            fee: 0,
            amount: 1,
            recipientAddress: toAddr
        }, account);
    }

    /* TODO : remove
    async request(resource, data)
    {
        return new Promise((resolve, reject) =>
        {
            var rpcData = JSON.stringify({
                "jsonrpc": "2.0",
                "method": resource,
                "params": data,
                "id": 0
            });
        
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            xhr.timeout = 5000; // TODO : doesn't work on port 33035 ?
            
            xhr.addEventListener("readystatechange", function() 
            {
                if (this.readyState === 4) 
                {
                    if (this.status === 200) 
                    {
                        try {
                            var response = JSON.parse(this.responseText);
                        } catch(e) {
                            reject('JSON.parse error: ' + String(e)) ;
                        }
                        if ("error" in response)
                            reject(response.error);
                        else
                            resolve(response.result);
                    }
                    else
                        reject('XMLHttpRequest error: ' + String(this.statusText));
                }
            });
            
            xhr.open("POST", NETWORK_ADDRESS[this.currentNetwork]);
            xhr.setRequestHeader("Content-Type", "application/json");
            
            xhr.send(rpcData);
        });
    }*/
}

export default Network;