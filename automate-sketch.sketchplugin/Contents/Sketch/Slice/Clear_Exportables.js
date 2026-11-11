var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Slice");

    var doc = context.document;
    var page = doc.currentPage();

    var selection = context.selection;
    var count = 0;

    if (selection.count() > 0) {
        var loopSelection = selection.objectEnumerator();
        while (layer = loopSelection.nextObject()) {
            var loopChildren = compatibility.descendants(layer).objectEnumerator();
            var child;
            while (child = loopChildren.nextObject()) {
                if (child.exportOptions().exportFormats().count() > 0 && child.class() != "MSSliceLayer") {
                    child.exportOptions().removeAllExportFormats();
                    count ++;
                }
            }
        }
    } else {
        var loopChildren = compatibility.descendants(page).objectEnumerator();
        var child;
        while (child = loopChildren.nextObject()) {
            if (child.exportOptions().exportFormats().count() > 0 && child.class() != "MSSliceLayer") {
                child.exportOptions().removeAllExportFormats();
                count ++;
            }
        }
    }

    var message;
    if (count > 1) {
        message = count + " exportable layers removed in current page.";
    } else if (count == 1) {
        message = "1 exportable layer removed in current page.";
    } else {
        message = "No exportable layers found in current page.";
    }
    doc.showMessage(message);



};
