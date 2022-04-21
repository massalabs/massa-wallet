$(document).ready(() =>
{
    //Get textarea containing JS code
    let jsDom = document.getElementById('massa_js_content');
    let jsContent = jsDom.value;
    
    eval(jsContent);

    //Remove textarea from the page
    jsDom.remove(); //remove jscontent
});