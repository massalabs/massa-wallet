window.onload = async () => {

    let params = new URLSearchParams(window.location.search);
    let site = params.get('url');
    let pageToLoad = params.get('page_to_load');
    if (pageToLoad == null)
        pageToLoad = 'index.html'; //TODO : default page

    document.getElementById('site_name').innerHTML = site;

    //TODO : params
    if (site == 'testblockchain')
    {
        let network = new Network();
        var bytes = await network.getZipFile();

        openZip(bytes, site, pageToLoad);
        return;
    }

    //TMP : internal zip file
    let zipFile = '../' + site + '.zip';
    console.log("opening : " + zipFile);

    JSZipUtils.getBinaryContent(zipFile, async function(err, data) {
        if(err) {
            throw err; // or handle err
        }

        openZip(data, site, pageToLoad);
    });
};

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