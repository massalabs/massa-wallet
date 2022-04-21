let IS_CHROME = /Chrome/.test(navigator.userAgent);
let mybrowser = IS_CHROME ? chrome : browser;

window.onload = () => {

    let params = new URLSearchParams(window.location.search);
    let site = params.get('url');
    let pageToLoad = params.get('page_to_load');
    if (pageToLoad == null)
        pageToLoad = 'index.html'; //TODO : default page configuration ?

    document.getElementById('site_name').innerHTML = site;

    getZipFile(site, pageToLoad);
};


//Get zip file from blockchain
async function getZipFile(site, pageToLoad)
{
    //DEBUG local zip
    //TODO : remove this
    if (site == "site" || site == 'site1' || site == 'site2')
    {
        JSZipUtils.getBinaryContent('../' + site + '.zip', function(err, data) {
            if(err) {
                throw err; // or handle err
            }
        
            openZip(data, site, pageToLoad);
        });
        return;
    }

    //Get network address
    let zip_base64 = await new Promise((resolve) => 
    {
        mybrowser.runtime.sendMessage({'action': "get_zip_file", 'site': site}, (res) =>
        {
            resolve(res);
        });
    });
    let zip_bytes = Uint8Array.from(atob(zip_base64), c => c.charCodeAt(0));
    openZip(zip_bytes, site, pageToLoad);
}

//Open zip file
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
        let isImage = (/\.(gif|jpg|jpeg|tiff|png|ico)$/i).test(src);
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
                    else if (type == 'ico')
                        type = 'x-icon';
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

        //TODO : use dom parser instead

        //Replace css
        this.html = this.html.replace(/<link.+?href=["'](?!http)(.+?)["'].*?>/gi, (str, p1) =>
        {
            let contentIndex = p1;
            if (p1.substring(0, 2) == './')
                contentIndex = p1.substring(2);
                
            if (!this.contents.hasOwnProperty(contentIndex))
            {
                console.log('trying to load file ' + contentIndex + ' not found in the zip file');
                return "";
            }
            
            if (str.match(/rel=["']icon["']/i))
            {
                //console.log('icon ' + p1);
                return str.replace(p1, this.contents[contentIndex]); // replace href part with base64 content
            }
            if (str.match(/rel=["']apple-touch-icon["']/i))
            {
                //console.log('apple icon ' + p1);
                str = str.replace(/rel=["']apple-touch-icon["']/i, 'rel="apple-touch-icon-precomposed"'); // change rel attribute
                return str.replace(p1, this.contents[contentIndex]); // replace href part with base64 content
            }
            //console.log('str='+str);
            if (str.match(/rel=["']stylesheet["']/i))
            {
                //console.log('replace style ' + p1);
                //console.log('str=' + str);
                return "<style>" + this.contents[contentIndex].replace(/\/\*# sourceMappingURL=.*\*\//g, '') + "</style>"; // replace link with inline style
            }
            
            //Unknown link rel attribute
            return str;
        });

        //Replace images
        this.html = this.html.replace(/<img.*src=["'](?!http)([^"']*)["'].*?>/gi, (str, p1) =>
        {
            let contentIndex = p1;
            if (p1.substring(0, 2) == './')
                contentIndex = p1.substring(2);
            if (!this.contents.hasOwnProperty(contentIndex))
            {
                console.log('trying to load file ' + contentIndex + ' not found in the zip file');
                return "";
            }
            return str.replace(p1, this.contents[contentIndex]); // replace src part with base64 content
        });

        //Handle links within the site
        this.html = this.html.replace(/<a.*href=["'](?!http|massa)([^"']*)["'].*?>/gi, (str, p1) =>
        {
            let page = p1;
            if (p1.substring(0, 2) == './')
                page = p1.substring(2);
            return str.replace(p1, '/massaweb/opensite.html?url=' + this.site + '&page_to_load=' + page); // replace src part with base64 content
        });

        //Replace js
        //We can't use inline script so we have to trick...
        let js = '';
        this.html = this.html.replace(/<script.*src=["'](?!http)([^"']*)["'].*?><\/script>/gi, (str, p1) =>
        {
            if (p1.substring(0, 2) == './')
                p1 = p1.substring(2);
            //console.log('replace js ' + p1);
            if (!this.contents.hasOwnProperty(p1))
            {
                console.log('trying to load file ' + p1 + ' not found in the zip file');
                return "";
            }
            js += this.contents[p1] + "\r\n";
            return "";
        });

        //Add inline js
        this.html = this.html.replace(/<script(?:(?!src).)*>(.*)<\/script>/gi, (str, p1) =>
        {
            //console.log('replace inline js');
            js += p1 + "\r\n";
            return "";
        });


        //Replace inline scripts in html (onclick='' etc...)
        js += this.compileJS();

        //Avoid html chars conversion
        js = js.replace(/&/g, '&amp;');
        
        //Add textarea containing js scripts (will be loaded with jsloader)
        js = '<textarea id="massa_js_content" style="display:none">' + js + '</textarea>';
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
        var pattern = /(<(.*?)\s+on([a-zA-Z]+)\s*=\s*('|")(.*)('|")(.*?))(>)/mgi;
    
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

