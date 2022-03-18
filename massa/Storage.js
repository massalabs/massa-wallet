let IS_CHROME = /Chrome/.test(navigator.userAgent);

let storageArea = 'local'; //could be 'sync' once published

export default Storage = {

    'get': async (key) =>
    {
        if (IS_CHROME)
        {
            return new Promise((resolve, reject) => 
            {
                chrome.storage[storageArea].get([key], (res) =>
                {
                    if (res && res[key])
                        resolve(res[key]);
                    else
                        resolve(null);
                });
            });
        }
        else
        {
            let res = await browser.storage[storageArea].get(key);
            if (res && res[key])
                return res[key];
            else
                return null;
        }
    },

    'set': (key, val) =>
    {
        let obj = {};
        obj[key] = val;
        if (IS_CHROME)
        {
            chrome.storage[storageArea].set(obj);
        }
        else
        {
            browser.storage[storageArea].set(obj);
        }
    }
}