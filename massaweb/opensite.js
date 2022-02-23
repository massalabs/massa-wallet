

//console.log(location);

window.onload = () => {

    let params = new URLSearchParams(window.location.search);
    let site = params.get('url');
    let pageToLoad = params.get('page_to_load');
    if (pageToLoad == null)
        pageToLoad = 'index.html'; //TODO : default page

    document.getElementById('site_name').innerHTML = site;

    let zipFile = '../' + site + '.zip';
    console.log("opening : " + zipFile);


    JSZipUtils.getBinaryContent(zipFile, async function(err, data) {
        if(err) {
            throw err; // or handle err
        }
    
        JSZip.loadAsync(data).then(async function (zip) {

            //Load files
            let helper = new ZipLoaderHelper(zip);
            let html = await helper.load(site, pageToLoad);

            //Replace html content
            var newHTML = document.open("text/html", "replace");
            newHTML.write(html);

            //Add inject.js
            newHTML.write('<script src="../inject.js" type="text/javascript"></script>');
            newHTML.close();
            
        });
    });
};

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
            while (!this.ready)
            {
                await this.sleep(100);
            }
            resolve(this.html);
        });
    }

    loadContent(src)
    {
        //Load img as base64, others as string
        let isImage = (/\.(gif|jpg|jpeg|tiff|png)$/i).test(src);
        let type = isImage ? "base64" : "string";
        this.zip.file(src).async(type).then((content) => 
        {
            if (isImage)
            {
                //Prefix with image type 
                let type = src.substring(src.lastIndexOf('.') + 1);
                if (type == 'jpg')
                    type = 'jpeg';
                content = 'data:image/' + type + ';base64, ' + content;
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
        this.html = this.getContent(this.pageToLoad);

        //Replace css
        this.html = this.html.replace(/<link.*href=["'](?!http)(.*)["']>/gi, (str, p1) =>
        {
            return "<style>" + this.contents[p1] + "</style>"; // replace link with inline style
        });

        //Replace js
        //TODO : not working
        this.html = this.html.replace(/<script.*src=["'](?!http)(.*)["']>/gi, (str, p1) =>
        {
            return "<script>" + this.contents[p1] + "</script>"; // replace script with inline style
        });

        //Replace images
        this.html = this.html.replace(/<img.*src=["'](?!http)(.*)["']>/gi, (str, p1) =>
        {
            return str.replace(p1, this.contents[p1]); // replace src part with base64 content
        });


        //TODO : handle links within the site
        this.html = this.html.replace(/<a.*href=["'](?!http|massa)(.*)["']>/gi, (str, p1) =>
        {
            return str.replace(p1, '/massaweb/opensite.html?url=' + this.site + '&page_to_load=' + p1); // replace src part with base64 content
        });

        //Ready
        this.ready = true;
    }

    getContent(src)
    {
        return this.contents[src];
    }

    async sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}