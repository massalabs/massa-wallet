const NETWORK_LOCAL = 0;
const NETWORK_TESTNET = 1;
const NETWORK_MAINNET = 2;

const NETWORK_ADDRESS = ['http://localhost:33035', "https://test.massa.net/api/v2", 'https://massa.net/api/v2']

class Network
{
    constructor()
    {
        this.currentNetwork = NETWORK_TESTNET;
    }

    setNetwork(network)
    {
        this.currentNetwork = network;
    }

    async getBalances(addresses)
    {
        if (addresses.length == 0) 
            return [];

        return new Promise((resolve, reject) => 
        {
            this.request('get_addresses', [addresses], (resJson) =>
            {
                let res = [];
                for (let i = 0; i < resJson.length; i++) 
                {
                    let address = resJson[i].address;
                    let balance = resJson[i].ledger_info.final_ledger_info.balance;
                    let candidateBalance = resJson[i].ledger_info.candidate_ledger_info.balance;
                    res.push({ address, balance, candidateBalance });
                }

                resolve(res);
            }, (e) =>
            {
                reject(e);
            });
        });
    }

    request(resource, data, completion_callback, error_callback)
    {
        var data = JSON.stringify({
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
            if (this.readyState === 4) {
                if (this.status === 200) {
                    try {
                        var response = JSON.parse(this.responseText);
                    } catch(e) {
                        error_callback('JSON.parse error: ' + String(e), this) ;
                    }
                    if ("error" in response) {
                        error_callback(response.error, this) ;
                    }
                    else {
                        completion_callback(response.result, this);
                    }
                }
                else {
                    error_callback('XMLHttpRequest error: ' + String(this.statusText), this);  
                }
            }
        });
        xhr.open("POST", NETWORK_ADDRESS[this.currentNetwork]);
        xhr.setRequestHeader("Content-Type", "application/json");
        
        xhr.send(data);
        return xhr;
    }

    async getLatestPeriod()
    {
        var xhr = new XMLHttpRequest();
        var url = NETWORK_ADDRESS[this.currentNetwork] + "/info";
        
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept','text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');

        return new Promise((resolve, reject) => 
        {
            xhr.onreadystatechange = function ()
            {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        try {
                            var response = JSON.parse(this.responseText);
                            resolve(response.last_period);
                        } catch(e) {
                            reject('JSON.parse error: ' + String(e));
                        }
                    }
                    else {
                        reject('XMLHttpRequest error: ' + String(this.statusText));
                    }
                }
            };
            xhr.send();
        });
    }
}

export default Network;
