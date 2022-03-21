const NETWORK_LOCAL = 0;
const NETWORK_TESTNET = 1;
const NETWORK_MAINNET = 2;

const NETWORK_ADDRESS = ['http://localhost:33035', "https://test.massa.net/api/v2", 'https://massa.net/api/v2']

class Network
{
    constructor()
    {
        this.currentNetwork = NETWORK_LOCAL;
    }

    async loadNetwork()
    {
        let res = await Storage.get('network');
        if (res !== null)
            this.currentNetwork = res;
    }

    setNetwork(network)
    {
        this.currentNetwork = network;

        Storage.set('network', network);
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
        
        console.log('LALA')
        console.log(NETWORK_ADDRESS[this.currentNetwork])

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

    async getZipFile()
    {
        var data = JSON.stringify({
            "jsonrpc": "2.0",
            "method": "get_addresses",
            "id": 111,
            "params": [
              [
                "9mvJfA4761u1qT8QwSWcJ4gTDaFP5iSgjQzKMaqTbrWCFo1QM"
              ]
            ]
          });

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.timeout = 5000; // TODO : doesn't work on port 33035 ?

        return new Promise((resolve, reject) => 
        {
            xhr.onreadystatechange = function ()
            {
                console.log('ICI')
                if(this.readyState === 4) {
                    try {
                        let json_response = JSON.parse(this.responseText);
                        console.log(json_response)
                        let zip_base64 = String.fromCharCode(...json_response['result'][0]['sce_ledger_info']['datastore']['2dzzGMAmBTMjYHRSszHGa3QYVTUVLoKzgsqmYizKGnsuhpoLud']) 
                        let zip_bytes = Uint8Array.from(atob(zip_base64), c => c.charCodeAt(0))
                        resolve(zip_bytes);
                    }
                    catch(e) { 
                        reject(e);
                    }
                }
            }

            console.log('LA')
            console.log(this.currentNetwork)
            console.log(NETWORK_ADDRESS[this.currentNetwork])

            xhr.open("POST", NETWORK_ADDRESS[this.currentNetwork]);
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.send(data);
            
        });
    }
}