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
    window.addEventListener('message', function(event) {
        if (event.data.type == 'sign_content')
        {
            //call web extension
            let IS_CHROME = /Chrome/.test(navigator.userAgent);
            let mybrowser = IS_CHROME ? chrome : browser;

            mybrowser.runtime.sendMessage({action: "sign_content", content: event.data.content}, (res) => {
               //send response
                event.source.postMessage({ type: 'sign_content_res', response: res}, event.origin);
            } );
        }
    });

    //Inject window.massa
    ((source)=>{
        const script = document.createElement("script");
        script.text = `(${source.toString()})();`;
        document.documentElement.appendChild(script);
      })(function (){
      
        window.massa = {

            //Sign json data
            async signContent(bytes)
            {
                return new Promise((resolve, reject) => {

                    //console.log('sending sign_content :', bytes);

                    window.postMessage({ type: 'sign_content', content: bytes}, '*');

                    //Will be resolved when response is received
                    this.resolve = resolve;
                });
            }
        };

        //Listen to response
        window.addEventListener('message', function(event) {
            if (event.data.type == 'sign_content_res')
            {
                window.massa.resolve(event.data.response);
                window.massa.resolve = null;
            }
        });
      })

})();
