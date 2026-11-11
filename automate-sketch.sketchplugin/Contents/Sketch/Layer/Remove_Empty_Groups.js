var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Layer");

    var doc = context.document;
    var page = doc.currentPage();
    var selection = context.selection;

    var count = 0;

    if (selection.count() > 0) {

        var loop = selection.objectEnumerator();
        var layer;
        while (layer = loop.nextObject()) {
            deleteEmptyGroups(layer, function(_count) {
                count += _count;
            });
        }

    } else {
        deleteEmptyGroups(page, function(_count) {
            count = _count;
        });
    }


    var message;
    if (count > 1) {
        message = "🎉 " + count + " empty groups removed.";
    } else if (count == 1) {
        message = "😊 1 empty group removed.";
    } else {
        message = "👍 Your document has no empty group.";
    }
    doc.showMessage(message);

};

function deleteEmptyGroups(layer, callback) {

    var count = 0;

    // Visit deepest groups first so a parent emptied by cleanup is removed too.
    var descendants = require("util").toArray(compatibility.descendants(layer)).reverse();
    descendants.push(layer);
    descendants.forEach(function(child) {
        if (compatibility.isGroup(child) && !child.containsLayers()) {
            child.removeFromParent();
            count++;
        }
    });

    callback(count);
}
