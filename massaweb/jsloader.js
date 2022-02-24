window.onload = () =>
{
    let jsDom = document.getElementById('massa_js_content');
    let jsContent = jsDom.value;
    //console.log(jsContent);
    eval(jsContent);

    jsDom.nextElementSibling.remove(); // remove jsloader
    jsDom.remove(); //remove jscontent
}