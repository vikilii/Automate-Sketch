var onRun = function() {
    var sketch = require("sketch/dom");
    var compatibility = require("../modules/Compatibility");
    var groups = sketch.getSelectedDocument().selectedLayers.layers.filter(compatibility.isGroup);
    if (!groups.length) { require("sketch/ui").message("Please select at least 1 group."); return; }
    groups.forEach(function(group) { group.convertToFrame(); });
};
