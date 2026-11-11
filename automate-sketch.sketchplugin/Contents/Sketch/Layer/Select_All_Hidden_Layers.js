var compatibility = require("../modules/Compatibility");
var sketch = require('sketch')

var onRun = function(context) {
    var ga = require("../modules/Google_Analytics");
    ga("Layer");

    var doc = context.document;
    var page = doc.currentPage();
    var selection = context.selection;

    if (selection.count() > 0) {
        if (page.deselectAllLayers) {
            page.deselectAllLayers();
        } else {
            page.changeSelectionBySelectingLayers(nil);
        }
        var loop = selection.objectEnumerator();
        while (layer = loop.nextObject()) {
            selectHiddenLayer(layer);
        }
    } else {
        selectHiddenLayer(page);
    }

};

function selectHiddenLayer(layer) {
    if (!layer.isVisible()) {
        // Fix Sketch 45
        if (compatibility.version < 45) {
            layer.select_byExpandingSelection(true, true);
        } else {
            layer.select_byExtendingSelection(true, true);
        }
    } else {
        var loopChildren = compatibility.descendants(layer).objectEnumerator();
        while (childLayer = loopChildren.nextObject()) {
            if (!childLayer.isVisible()) {
                // Fix Sketch 45
                if (compatibility.version < 45) {
                    childLayer.select_byExpandingSelection(true, true);
                } else {
                    childLayer.select_byExtendingSelection(true, true);
                }
            }
        }
    }
}
