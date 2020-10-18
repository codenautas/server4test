
async function fetchAndShow(url:string, id:string):Promise<void>{
    let element = document.getElementById(id)!;
    try{
        let response = await fetch(url);
        element.style.color='green';
        let content = await response.text();
        element.textContent=content;
    }catch(err){
        element.style.color='red';
        console.log(err);
        element.textContent=err.message;
    };
}

window.addEventListener('load', function(){
    fetchAndShow('/dummy1','dummy');
    fetchAndShow('/up-time','up-time');
});
