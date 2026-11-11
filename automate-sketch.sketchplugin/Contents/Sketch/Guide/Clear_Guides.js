var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Guide");

    var sketch = require("sketch");
    var document = sketch.getSelectedDocument();
    var selectedLayers = document.selectedLayers.layers;
    var util = require("util");

    showRuler(document.sketchObject);

    if (selectedLayers.length == 0) {
        var page = document.selectedPage.sketchObject;
        clearGuides(page);
        var artboards = util.toArray(compatibility.artboards(page));
        artboards.forEach(function(artboard) {
            clearGuides(artboard);
        });
    } else {
        selectedLayers.forEach(function(layer) {
            if (compatibility.isArtboard(layer) || layer.type == "SymbolMaster") {
                clearGuides(layer.sketchObject);
            } else {
                clearGuides(layer.sketchObject.parentArtboard());
            }
        });
    }
};

function clearGuides(target) {
    compatibility.rulerData(target, "horizontal").removeAllGuides();
    compatibility.rulerData(target, "vertical").removeAllGuides();
}

function showRuler(document) {
    if (!document.isRulersVisible()) {
        var toggleRulersAction = compatibility.action(document,"MSToggleRulersAction");
        if(toggleRulersAction.validate()) {
            toggleRulersAction.performAction(nil);
        }
    }
}