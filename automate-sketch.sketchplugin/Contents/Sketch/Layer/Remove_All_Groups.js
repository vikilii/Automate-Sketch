var compatibility = require("../modules/Compatibility");
var onRun = function (context) {

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
            deleteGroups(layer, function (_count) {
                count += _count;
            });
        }

    } else {
        deleteGroups(page, function (_count) {
            count = _count;
        });
    }


    var message;
    if (count > 1) {
        message = "🎉 " + count + " groups removed.";
    } else if (count == 1) {
        message = "😊 1 group removed.";
    } else {
        message = "👍 Your document has no group.";
    }
    doc.showMessage(message);

};

function deleteGroups(layer, callback) {

    var count = 0;

    var descendants = require("util").toArray(compatibility.descendants(layer)).reverse();
    descendants.push(layer);
    descendants.forEach(function(child) {
        if (compatibility.isGroup(child)) { child.ungroup(); count++; }
    });

    callback(count);
}

