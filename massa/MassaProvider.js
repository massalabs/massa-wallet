//TODO : implement provider methods like Metamask :
//https://docs.metamask.io/guide/ethereum-provider.html#events
//Instance will be injected in window.massa

class MassaProvider
{
    constructor()
    {
    }


    //Sign json data
    async signContent(jsonContent)
    {
        browser.browserAction.openPopup();

    }


    //Could be like Metamask
    request({ method, params })
    {
        //TODO
        if (method == 'sendTransaction')
        {

        }
    }
}

export default MassaProvider;