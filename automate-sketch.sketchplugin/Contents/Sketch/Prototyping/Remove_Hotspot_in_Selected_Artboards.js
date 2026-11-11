var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Prototyping");

    var util = require("util");
    var sketch = require("sketch");
    var document = sketch.getSelectedDocument();
    var selectedLayers = document.selectedLayers.layers;

    selectedLayers.filter(function(layer) {
        return compatibility.isArtboard(layer) || layer.type == "SymbolMaster";
    }).forEach(function(layer) {
        var children = util.toArray(compatibility.descendants(layer.sketchObject));
        children.forEach(function(child) {
            if (child.flow()) {
                if (child.class() == "MSHotspotLayer") {
                    child.removeFromParent();
                } else {
                    child.setFlow(null);
                }
            }
        });
    });

    // document.sketchObject.loadLayerListPanel();
};