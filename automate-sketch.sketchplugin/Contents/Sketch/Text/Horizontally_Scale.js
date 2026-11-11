var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Type");

    var pluginIdentifier = context.command.identifier();
    var document = context.document;
    var selection = context.selection;
    var predicate = NSPredicate.predicateWithFormat("className == %@", "MSTextLayer");
    var selectedTextLayers = selection.filteredArrayUsingPredicate(predicate);
    if (selectedTextLayers.count() == 0) {
        document.showMessage("Please select at least 1 text layer.");
        return;
    }

    var stepSize = 0.1;

    selectedTextLayers.forEach(function(layer) {

        var scale = compatibility.textAttribute(layer, NSExpansionAttributeName) ? compatibility.textAttribute(layer, NSExpansionAttributeName) : 0;

        if (pluginIdentifier == "increase_horizontally_scale") {
            scale = scale + stepSize;
            compatibility.setTextAttribute(layer, NSExpansionAttributeName, scale);
        }

        if (pluginIdentifier == "decrease_horizontally_scale") {
            scale = scale - stepSize;
            compatibility.setTextAttribute(layer, NSExpansionAttributeName, scale);
        }

        if (pluginIdentifier == "reset_horizontally_scale") {
            compatibility.setTextAttribute(layer, NSExpansionAttributeName, 0);
        }

    });

};
