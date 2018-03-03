"use strict";

function fetchAndShow(url, id){
    var element = document.getElementById(id);
    fetch(url).then(function(response){
        element.style.color='green';
        return response.text().then(function(content){
            element.textContent=content;
        });
    }, function(err){
        element.style.color='red';
        console.log(err);
        element.textContent=err.message;
    });
}
window.addEventListener('load', function(){
    fetchAndShow('/dummy1','dummy');
    fetchAndShow('/up-time','up-time');
});
