var onRun = function() {
    var dom=require("sketch/dom"), compatibility=require("../modules/Compatibility");
    var doc=dom.getSelectedDocument(), selected=doc.selectedLayers.layers, seen={};
    (selected.length?selected:[doc.selectedPage]).forEach(function(root){
        [root].concat(require("util").toArray(compatibility.descendants(root)).map(dom.fromNative)).forEach(function(layer){
            if(seen[layer.id] || !layer.style) return;seen[layer.id]=true;
            ["fills","borders","shadows","innerShadows"].forEach(function(key){
                var parts=layer.style[key];
                layer.style[key]=parts.filter(function(part){return part.enabled;});
            });
        });
    });
};
