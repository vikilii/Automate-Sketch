var onRun = function() {
    var document = require("sketch/dom").getSelectedDocument();
    var count = 0;
    document.selectedLayers.layers.forEach(function(instance) {
        if (instance.type !== "SymbolInstance" || instance.master.getLibrary()) return;
        var selected = instance.overrides.filter(function(override) { return override.selected; });
        var ids = selected.map(function(override) { return override.id; });
        instance.master.overrides.forEach(function(override) {
            if (ids.indexOf(override.id) !== -1) { override.editable = false; count++; }
        });
    });
    if (!count) require("sketch/ui").message("Please select at least 1 override in a local symbol instance.");
};
