//Replace click event on links with massa://
$(document).ready(() =>
{
    if (window.hasRun)
        return;
    window.hasRun = true;

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

    /*
    chrome.tabs.getCurrent(function (tab) {
  //Your code below...
  let myNewUrl = `https://www.mipanga.com/Content/Submit?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title)}`;

  //Update the url here.
  chrome.tabs.update(tab.id, { url: myNewUrl });
});
*/
    //console.log(links.length + ' links parsed');

});

//console.log('inject loaded');