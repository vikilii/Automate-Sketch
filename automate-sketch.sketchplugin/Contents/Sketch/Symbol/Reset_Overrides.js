var onRun = function() {
    var document = require("sketch/dom").getSelectedDocument();
    var instances = document.selectedLayers.layers.filter(function(layer) { return layer.type === "SymbolInstance"; });
    if (!instances.length) { require("sketch/ui").message("Please select at least 1 symbol instance."); return; }
    instances.forEach(function(instance) { instance.overrides.forEach(function(override) { override.reset(); }); });
};
