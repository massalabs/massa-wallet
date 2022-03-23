let IS_CHROME = /Chrome/.test(navigator.userAgent);
let mybrowser = IS_CHROME ? chrome : browser;

window.onload = async () => {

    let params = new URLSearchParams(window.location.search);
    let site = params.get('url');
    let pageToLoad = params.get('page_to_load');
    if (pageToLoad == null)
        pageToLoad = 'index.html'; //TODO : default page configuration ?

    document.getElementById('site_name').innerHTML = site;

    //TODO-TMP : internal zip file (remove)
    /*
    if (site == 'site1' || site == 'site2')
    {
        let zipFile = '../' + site + '.zip';
        console.log("opening : " + zipFile);

        JSZipUtils.getBinaryContent(zipFile, async function(err, data) {
            if(err) {
                throw err; // or handle err
            }

            openZip(data, site, pageToLoad);
        });
        return;
    }*/

    var bytes = await getZipFile(site);
    openZip(bytes, site, pageToLoad);
    return;
};


//Get zip file from blockchain
async function getZipFile(site)
{
    //Get network address
    let networkAddr = await new Promise((resolve) => 
    {
        mybrowser.runtime.sendMessage({action: "get_network"}, (res) =>
        {
            resolve(res);
        });
    });

    //console.log(networkAddr);

    //Get site address
    let site_encoded = xbqcrypto.base58check_encode(xbqcrypto.hash_sha256('record'+site));
    let params = [
        [
          // DNS address
          "2QsZ5P3oU1w8bTPjxFaFqcBJjTuJDDxV2Y6BuwHuew1kH8rxTP"
        ]
    ];
    let json_response = await request(networkAddr, 'get_addresses', params);
    console.log('site_encoded : ' + site_encoded)
    console.log(json_response);

    // TODO: handle entry missing
    //TMP: force site_encoded to existing entry
    site_encoded = "2KRvgrvfLNL5Dh8N4P2BinHXkF7ZAnhcVfnBYnbUhvKzVgefd9";
    let site_address = String.fromCharCode(...json_response[0]['sce_ledger_info']['datastore'][site_encoded]);

    params = [
        [
          site_address
        ]
    ];

    //Get zip
    //TODO : what is '2dzzGMAmBTMjYHRSszHGa3QYVTUVLoKzgsqmYizKGnsuhpoLud' ??
    json_response = await request(networkAddr, 'get_addresses', params);
    let zip_base64 = String.fromCharCode(...json_response[0]['sce_ledger_info']['datastore']['2dzzGMAmBTMjYHRSszHGa3QYVTUVLoKzgsqmYizKGnsuhpoLud']) 
    let zip_bytes = Uint8Array.from(atob(zip_base64), c => c.charCodeAt(0))
    
    return zip_bytes;
}

//Promisify xhr and return json response
async function request(address, resource, data)
{
    return new Promise((resolve, reject) =>
    {
        var rpcData = JSON.stringify({
            "jsonrpc": "2.0",
            "method": resource,
            "params": data,
            "id": 0
        });
    
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.timeout = 5000; // TODO : doesn't work on port 33035 ?
        
        xhr.addEventListener("readystatechange", function() 
        {
            if (this.readyState === 4) 
            {
                if (this.status === 200) 
                {
                    try {
                        var response = JSON.parse(this.responseText);
                    } catch(e) {
                        reject('JSON.parse error: ' + String(e)) ;
                    }
                    if ("error" in response)
                        reject(response.error);
                    else
                        resolve(response.result);
                }
                else
                    reject('XMLHttpRequest error: ' + String(this.statusText));
            }
        });
        
        xhr.open("POST", address);
        xhr.setRequestHeader("Content-Type", "application/json");
        
        xhr.send(rpcData);
    });
}

function openZip(data, site, pageToLoad)
{
    JSZip.loadAsync(data).then(async function (zip) {

        //Load files
        let helper = new ZipLoaderHelper(zip);
        let html = await helper.load(site, pageToLoad);

        //Replace html content
        var newHTML = document.open("text/html", "replace");
        newHTML.write(html);

        //Add jquery
        newHTML.write('<script src="../lib/jquery.min.js" type="text/javascript"></script>');

        //Add jsloader.js
        newHTML.write('<script src="jsloader.js" type="text/javascript"></script>');
        
        //Add inject.js
        newHTML.write('<script src="../inject.js" type="text/javascript"></script>');

        newHTML.close();
        
    });
}

//This class handles files in the zip and do html rewriting
class ZipLoaderHelper
{
    constructor(zip)
    {
        this.zip = zip;
        this.contents = {};

        this.ready = false;
        this.filesToLoad = 0;
        this.loadedCount = 0;

        this.site = '';
        this.pageToLoad = '';
        this.html = '';
    }

    async load(site, pageToLoad)
    {
        this.site = site;
        this.pageToLoad = pageToLoad;
        this.filesToLoad = 0;
        
        for (let src in this.zip.files)
        {
            if (!this.zip.files[src].dir)
            {
                this.filesToLoad++;
                this.loadContent(src);
            }
        }

        return new Promise(async (resolve, reject) =>
        {
            while (!this.ready) // wait for all files to be loaded
            {
                await this.sleep(100);
            }
            resolve(this.html); // return html of the pageToLoad
        });
    }

    loadContent(src)
    {
        //Load img as base64, others as string
        let isImage = (/\.(gif|jpg|jpeg|tiff|png)$/i).test(src);
        let isSvg = (/\.svg$/i).test(src);
        let type = isImage ? "base64" : "string";
        this.zip.file(src).async(type).then((content) => 
        {
            if (isImage || isSvg)
            {
                //Prefix with image type 
                let type = src.substring(src.lastIndexOf('.') + 1);
                if (isSvg)
                {
                    type = 'svg+xml;utf8';

                    content = content.substring(content.indexOf('<svg'));
                    content = encodeURIComponent(content);
                }
                else 
                {
                    if (type == 'jpg')
                        type = 'jpeg';
                    type += ';base64';
                }
                
                content = 'data:image/' + type + ', ' + content;
            }   

            this.contents[src] = content;
            this.loadedCount++;
            console.log(src + ' loaded ' + this.loadedCount + '/' + this.filesToLoad);
            if (this.loadedCount == this.filesToLoad)
                this.computeFinalHtml();
        });
    }

    computeFinalHtml()
    {
        this.html = this.contents[this.pageToLoad];

        //Replace css
        this.html = this.html.replace(/<link.*href=["'](?!http)(.*)["']>/gi, (str, p1) =>
        {
            return "<style>" + this.contents[p1] + "</style>"; // replace link with inline style
        });

        //Replace images
        this.html = this.html.replace(/<img.*src=["'](?!http)(.*)["']>/gi, (str, p1) =>
        {
            return str.replace(p1, this.contents[p1]); // replace src part with base64 content
        });

        //Handle links within the site
        this.html = this.html.replace(/<a.*href=["'](?!http|massa)(.*)["']>/gi, (str, p1) =>
        {
            return str.replace(p1, '/massaweb/opensite.html?url=' + this.site + '&page_to_load=' + p1); // replace src part with base64 content
        });

        //Replace js
        //We can't use inline script so we have to trick...
        let js = '<textarea id="massa_js_content" style="display:none">';
        this.html = this.html.replace(/<script.*src=["'](?!http)(.*)["']><\/script>/gi, (str, p1) =>
        {
            js += this.contents[p1] + "\r\n";
            return "";
        });

        //Add inline js
        this.html = this.html.replace(/<script(?:(?!src).)*>(.*)<\/script>/gi, (str, p1) =>
        {
            js += p1 + "\r\n";
            return "";
        });

        //Replace inline scripts in html (onclick='' etc...)
        js += this.compileJS();
        js += '</textarea>';
        
        //Add textarea containing js scripts (will be loaded with jsloader)
        let bodyEnd = this.html.indexOf('</body>');
        this.html = this.html.substring(0, bodyEnd) + js + this.html.substring(bodyEnd);

        //Ready
        this.ready = true;
    }

    //Replace inline scripts (onclick='' etc...) with js code
    compileJS()
    {
        var matches = [];
        var match = null;
    
        //Find 'on...' events inside html
        var pattern = /(<(.*?)on([a-zA-Z]+)\s*=\s*('|")(.*)('|")(.*?))(>)/mgi;
    
        while (match = pattern.exec(this.html)) {
            var arr = [];
            for (i in match) {
                if (!isNaN(i)) {
                    arr.push(match[i]);
                }
            }
            matches.push(arr);
        }

        //console.log(matches);
        
        var items_with_events = [];
        var compiledHtml = this.html;
    
        //Remove the on... part and add custom_id
        for (var i in matches)
        {
            if (matches[i][0].indexOf('http-equiv') >= 0) continue;

            var jsCode = matches[i][5].replace('javascript:', '');
            var id = "my_app_identifier_" + i;

            var item_with_event = {
                custom_id : id,
                code : jsCode,
                on : matches[i][3].toLowerCase(),
            };
            items_with_events.push(item_with_event);
            compiledHtml = compiledHtml.replace(/(<(.*?)on([a-zA-Z]+)\s*=\s*('|")(.*)('|")(.*?))(>)/m, "<$2 custom_id='"+item_with_event.custom_id+"' $7 $8");
        }
    
        this.html = compiledHtml;
        
        //Make js code to eval
        var js = '';
        for ( var i in items_with_events )
        {
            js += '$("[custom_id=' + items_with_events[i].custom_id + ']").bind("' + items_with_events[i].on + '", function(){'
            + items_with_events[i].code
            + '});'
        }
        //console.log(js);

        return js;
    }

    async sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

