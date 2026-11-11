var onRun = function() {
    var dom=require("sketch/dom"),compatibility=require("../modules/Compatibility");
    var doc=dom.getSelectedDocument(),layers=doc.selectedLayers.layers;
    if(layers.length!==1 || !layers[0].flow) {require("sketch/ui").message("Please select 1 layer with a link.");return;}
    layers[0].flow=undefined;
    compatibility.performAction(doc,"MSAddFlowAutomaticAction");
};
