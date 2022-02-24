(function() {

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
                chrome.tabs.create({'url' : "/massaweb/opensite.html?url=" + siteToLoad });
                return false;
            }
        };
    }

    //console.log(links.length + ' links parsed');

})();

//console.log('inject loaded');