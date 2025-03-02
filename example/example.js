async function accion(id, nombre, fileName, path, sendContent, cb){
    var e=document.getElementById(id);
    var boton=document.getElementById(nombre);
    var m=document.getElementById('time');
    boton.onclick=async ()=>{
        var response = await fetch(path+'?file='+fileName+(sendContent ? '&content='+JSON.stringify(e.value):''),{method:'GET'});
        var content = await response.json();
        await cb(e,content.content && JSON.parse(content.content));
        m.textContent = new Date(content.timestamp)
    }
}

window.addEventListener('load',async function(){
    
    accion('info', 'guardar', 'data-file.txt', '/file-write' , true , async (e,content)=>{})
    accion('info', 'borrar' , 'data-file.txt', '/file-delete', false, async (e,content)=>{})
    accion('info', 'traer'  , 'data-file.txt', '/file-read'  , false, async (e,content)=>{ e.value=content; })

    accion('mymd', 'guardar', 'my-document.md', '/file-write' , true , async (e,content)=>{})
    accion('mymd', 'borrar' , 'my-document.md', '/file-delete', false, async (e,content)=>{})
    accion('mymd', 'traer'  , 'my-document.md', '/file-read'  , false, async (e,content)=>{ e.value=content; })

    var simplemde = new EasyMDE({ element: document.getElementById("mymd") });
    simplemde.codemirror.on("change", function(){
        console.log(simplemde.value());
    });
})