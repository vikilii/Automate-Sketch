var onRun = function() {
    var dom=require("sketch/dom"),UI=require("sketch/ui"),System=require("../modules/System");
    var images={},layers=dom.getSelectedDocument().selectedLayers.layers;
    function add(image) {if(image && image.nsdata && image.nsdata.length()) images[image.id]=image;}
    layers.forEach(function(layer){
        if(layer.type==='Image') add(layer.image);
        if(layer.style) layer.style.fills.forEach(function(fill){if(fill.fillType==='Pattern' && fill.pattern) add(fill.pattern.image);});
    });
    var ids=Object.keys(images);
    if(!ids.length) {UI.message("No image-fill or bitmap layers in selection.");return;}
    var folder=System.chooseFolder();if(!folder) return;
    ids.forEach(function(id){System.exportImageDataAsPng(images[id],String(folder)+"/"+id+".png");});
    System.showInFinder(folder);
};
