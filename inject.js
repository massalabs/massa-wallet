(//Make sure script is loaded once
function()
{
    if (window.hasRun)
        return;
    window.hasRun = true;

    //Replace click event on links with massa://
    $(document).ready(() =>
    {
        let links = document.querySelectorAll('a');
        for (let i = 0; i < links.length; i++)
        {
            if (links[i].href.substring(0, 8) != 'massa://')
                continue;
            links[i].onclick = function()
            {
                let siteToLoad = this.href.substring(8);
                
                if (links[i].getAttribute('target') == '_blank')
                    chrome.tabs.create({'url' : "/massaweb/opensite.html?url=" + siteToLoad });
                else
                    chrome.tabs.update(undefined, {'url' : "/massaweb/opensite.html?url=" + siteToLoad });
                return false;
            };
        }
    });

    //Listen to messages for the web extension
    //The window object is the web extension one (not the same as injected page window object)
    window.addEventListener('message', function(event) 
    {
        let IS_CHROME = /Chrome/.test(navigator.userAgent);
        let mybrowser = IS_CHROME ? chrome : browser;

        if (event.data.type == 'sign_content')
        {
            //call web extension
            mybrowser.runtime.sendMessage({action: "sign_content", content: event.data.content}, (res) => {
                //send response
                event.source.postMessage({ type: 'sign_content_res', response: res}, event.origin);
            } );
        }

        //Send web3 client to the page
        if (event.data.type == 'get_web3_client')
        {
            mybrowser.runtime.sendMessage({action: "get_web3_client"}, (res) => {
                event.source.postMessage({ type: 'get_web3_client_res', response: res}, event.origin);
            } );
        }
    });

    //Inject window.massa
    ((source)=>{
        const script = document.createElement("script");
        script.text = `(${source.toString()})();`;
        document.documentElement.appendChild(script);
      })(function (){
        
        class Massa
        {
            constructor()
            {
                this.version = "1.1";
                this.enabled = false;
                this.resolve = null;
            }

            enable(val)
            {
                this.enabled = val;
            }

            //Sign json data
            async signContent(bytes)
            {
                if (!this.enabled) 
                {
                    console.error('massa is disabled, you have to use massa.enable(true) to enable it');
                    return false;
                }
                
                return new Promise((resolve, reject) => {

                    //console.log('sending sign_content :', bytes);

                    window.postMessage({ type: 'sign_content', content: bytes}, '*');

                    //Will be resolved when response is received
                    this.resolve = resolve;
                });
            }
        }

        window.massa = new Massa();

        //Listen to response
        window.addEventListener('message', function(event) {
            if (event.data.type == 'sign_content_res')
            {
                window.massa.resolve(event.data.response);
                window.massa.resolve = null;
            }
            if (event.data.type == 'get_web3_client_res')
            {
                //Inject window.web3Client
                window.web3Client = event.data.response;
            }
        });

        //get web3Client
        window.postMessage({ type: 'get_web3_client'}, '*');
      })
})();
