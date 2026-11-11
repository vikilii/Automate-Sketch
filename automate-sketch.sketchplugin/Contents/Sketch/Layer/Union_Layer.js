var onRun = function() {
    var dom=require("sketch/dom"), compatibility=require("../modules/Compatibility");
    var doc=dom.getSelectedDocument(), selected=doc.selectedLayers.layers;
    var frames=(selected.length?selected:doc.selectedPage.layers).filter(compatibility.isArtboard);
    if(!frames.length) {require("sketch/ui").message("Please select at least 1 frame.");return;}
    var count=0;
    frames.forEach(function(frame){
        var layers=frame.layers.filter(function(layer){return layer.type!=="Slice" && !layer.hidden && !layer.locked;});
        if(layers.length<2 && !(layers.length===1 && layers[0].layers)) return;
        doc.selectedLayers=layers;
        var action=compatibility.action(doc,"MSUnionAction");
        if(action && action.validate()) {action.booleanUnion(null);count++;}
    });
    require("sketch/ui").message("Union applied to " + count + " frames.");
};
