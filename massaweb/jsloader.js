$(document).ready(() =>
{
    //Get textarea containing JS code
    let jsDom = document.getElementById('massa_js_content');
    let jsContent = jsDom.value;
    //console.log(jsContent);
    eval(jsContent);

    //Remove scripts from the page
    jsDom.nextElementSibling.remove(); // remove jsloader
    jsDom.remove(); //remove jscontent
});