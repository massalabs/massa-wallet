//Redirect massa://site_name to massaweb/opensite.html?url=site_name
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
        chrome.tabs.update(details.tabId, { url: "massaweb/opensite.html?url=" + siteToLoad });
    }
});