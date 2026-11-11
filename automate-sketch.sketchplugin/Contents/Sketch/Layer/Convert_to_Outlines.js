var onRun = function() {
    var dom = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var doc = dom.getSelectedDocument();
    var selected = doc.selectedLayers.layers;
    var roots = selected.length ? selected : [doc.selectedPage];
    var seen = {}, targets = [];
    roots.forEach(function(root) {
        [root].concat(require("util").toArray(compatibility.descendants(root)).map(dom.fromNative)).forEach(function(layer) {
            if (!seen[layer.id] && ["Text","Shape","ShapePath"].indexOf(layer.type) !== -1) { seen[layer.id]=true; targets.push(layer); }
        });
    });
    var converted = [];
    targets.forEach(function(layer) {
        var result = layer.sketchObject.layersByConvertingToOutlines();
        if (result) converted = converted.concat(require("util").toArray(result).map(dom.fromNative));
    });
    if (converted.length) doc.selectedLayers = converted;
    require("sketch/ui").message(converted.length ? targets.length + " layers converted to outlines." : "No convertible layers found.");
};
