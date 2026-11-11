var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Symbol");

    var sketch = require("sketch/dom");
    var UI = require("sketch/ui");

    var document = sketch.getSelectedDocument();
    var selection = document.selectedLayers.layers;
    var selectedSymbolMaster = selection.find(function(layer) {
        return layer.type == "SymbolMaster";
    });
    if (selection.length != 1 || selectedSymbolMaster == undefined) {
        UI.message("Please select 1 symbol master.");
        return;
    }

    var instance = selectedSymbolMaster.createNewInstance();
    instance.parent = document.selectedPage;
    var origin = require("../modules/Compatibility").originForNewArtboard(document.selectedPage, instance.frame);
    instance.frame.x = origin.x;
    instance.frame.y = origin.y;
    document.selectedLayers = [instance];
};
