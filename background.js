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

//Messages handling
import MessageManager from './massa/MessageManager.js';
let manager = new MessageManager();

let IS_CHROME = /Chrome/.test(navigator.userAgent);
let mybrowser = IS_CHROME ? chrome : browser;

if (IS_CHROME)
{
    mybrowser.runtime.onMessage.addListener((request, sender, sendResponse) => 
    {
        manager.onMessage(request, sender, sendResponse);
        return true; // need to return true to allow async
    });
}
else
{
    mybrowser.runtime.onMessage.addListener(async (request, sender, sendResponse) => 
    {
        return manager.onMessage(request, sender, sendResponse);       
    });
}