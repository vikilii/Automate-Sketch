var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Type");

    var doc = context.document;
    var selection = context.selection;

    if (selection.count() > 0) {

        var loopSelection = selection.objectEnumerator();
        var layer;
        while (layer = loopSelection.nextObject()) {
            if (layer.class() == "MSTextLayer") {

                if (
                    compatibility.textAttribute(layer, NSVerticalGlyphFormAttributeName) == null ||
                    compatibility.textAttribute(layer, NSVerticalGlyphFormAttributeName) == 0
                ) {
                    compatibility.setTextAttribute(layer, NSVerticalGlyphFormAttributeName, 1);
                    if (layer.rotation() == 0) {
                        layer.setRotation(-90)
                    }
                } else {
                    compatibility.setTextAttribute(layer, NSVerticalGlyphFormAttributeName, 0);
                    if (layer.rotation() == -90) {
                        layer.setRotation(0)
                    }
                }

            }
        }

    } else {
        doc.showMessage("Please select at least 1 text layer.");
    }

};
