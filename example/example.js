/**
 * 
 * @param {{id:string, nombre:string, fileName:string, path:string, sendContent?:(e:HTMLElement)=>string, getContent?:(e:HTMLElement, c:string)=>void}} params 
 */
async function accion(params){
    var {id, nombre, fileName, path, sendContent, sendContent, getContent} = params
    var e=document.getElementById(id);
    var boton=document.getElementById(nombre);
    var m=document.getElementById('time');
    boton.onclick=async ()=>{
        var response = await fetch(path+'?file='+fileName+(sendContent ? '&content='+encodeURIComponent(sendContent(e.value)):''),{method:'GET'});
        var content = await response.json();
        await cb(e,content.content && JSON.parse(content.content));
        m.textContent = new Date(content.timestamp)
    }
}

/* DOC:
https://github.com/Ionaru/easy-markdown-editor#readme
https://codemirror.net/
*/

window.addEventListener('load',async function(){
    var plain = {id:'info', fileName:'data-file.txt'}
    accion({...plain, nombre:'guardar', path:'/file-write' , sendContent: (e)=>JSON.stringify(e.value)})
    accion({...plain, nombre:'borrar' , path:'/file-delete'})
    accion({...plain, nombre:'traer'  , path:'/file-read'  , getContent: async (e,content)=>{e.value=content; }})

    var simplemde = new EasyMDE({ element: document.getElementById("mymd") });
    simplemde.codemirror.on("change", function(){
        // console.log(simplemde.value());
    });
    var markd = {id:'mymd', fileName:'my-document.md'}
    accion({...markd, nombre:'guardar', path:'/file-write' , sendContent: ()=>simplemde.value()})
    accion({...markd, nombre:'borrar' , path:'/file-delete'})
    accion({...markd, nombre:'traer'  , path:'/file-read'  , getContent: async (_,content)=>{simplemde.value(content); }})

})