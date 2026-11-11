var compatibility = require("../modules/Compatibility");
var onRun = function(context) {
    var ga = require("../modules/Google_Analytics");
    ga("Layer");
    var doc = context.document;
    var page = doc.currentPage();
    var layers = compatibility.descendants(page);
    var loop = layers.objectEnumerator();
    while (layer = loop.nextObject()) {
        if (layer.isLocked()) {
            layer.setIsLocked(false);
        }
    }
};
