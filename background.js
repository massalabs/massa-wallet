
chrome.webNavigation.onBeforeNavigate.addListener(async (details) =>
{
    //console.log('going to ' + details.url)

    const massaPrefix = 'massa%3A%2F%2F';

    let massaProtocolIndex = details.url.indexOf(massaPrefix);
    let isMassaWeb = details.url.indexOf('massaweb/') >= 0;

    if (massaProtocolIndex >= 0 && !isMassaWeb)
    {
        let siteToLoad = details.url.substring(massaProtocolIndex + massaPrefix.length);
        //console.log('DETECTED massa://' + siteToLoad);
        
        //TODO : go to opensite on the same tab index (instead of new tab)

        chrome.tabs.create({
            url: "massaweb/opensite.html?url=" + siteToLoad
          });
        chrome.tabs.remove(details.tabId);
    }
});