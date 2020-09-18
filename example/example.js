async function accion(nombre, path, sendContent, cb){
    var e=document.getElementById('info');
    var boton=document.getElementById(nombre);
    var m=document.getElementById('time');
    boton.onclick=async ()=>{
        var response = await fetch(path+'?file=data-file.txt'+(sendContent ? '&content='+JSON.stringify(e.value):''),{method:'GET'});
        var content = await response.json();
        await cb(e,content.content && JSON.parse(content.content));
        m.textContent = new Date(content.timestamp)
    }
}

window.addEventListener('load',async function(){
    
    accion('guardar', '/file-write' , true , async (e,content)=>{})
    accion('borrar' , '/file-delete', false, async (e,content)=>{})
    accion('traer'  , '/file-read'  , false, async (e,content)=>{ e.value=content; })

})