(//Make sure script is loaded once
function()
{
    if (window.hasRun)
        return;
    window.hasRun = true;

    let IS_CHROME = /Chrome/.test(navigator.userAgent);
    let mybrowser = IS_CHROME ? chrome : browser;

    //Replace click event on links with massa://
    $(document).ready(() =>
    {
        

        let links = document.querySelectorAll('a');
        for (let i = 0; i < links.length; i++)
        {
            links[i].onclick = function()
            {
                if (this.href.substring(0, 8) == 'massa://')
                {
                    let siteToLoad = this.href.substring(8);
                    
                    if (links[i].getAttribute('target') == '_blank')
                        chrome.tabs.create({'url' : "/massaweb/opensite.html?url=" + siteToLoad });
                    else
                        chrome.tabs.update(undefined, {'url' : "/massaweb/opensite.html?url=" + siteToLoad });
                    return false;
                }
            };
        }
    });

    //console.log('inject loaded');

    //set provider
    mybrowser.runtime.sendMessage({action: "get_provider"}, (provider) => { window.massa = provider; } );
})();
