// Sketch removed click-through groups. Graphics are the modern container for
// content selected as a unit; regular groups expose their children on canvas.
var onRun = function() {
    var dom = require("sketch/dom");
    var selected = dom.getSelectedDocument().selectedLayers.layers.filter(function(layer) {
        return layer.type === "Group" && (!layer.isFrame || layer.isGraphicFrame);
    });
    if (!selected.length) { require("sketch/ui").message("Please select a group or graphic container."); return; }
    selected.forEach(function(layer) {
        if (layer.isGraphicFrame) layer.sketchObject.convertToGroup();
        else layer.convertToGraphic();
    });
};
