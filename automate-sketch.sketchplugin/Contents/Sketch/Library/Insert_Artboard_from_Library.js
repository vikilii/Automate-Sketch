var compatibility = require("../modules/Compatibility");
var onRun = function(context) {
    var ga = require("../modules/Google_Analytics");
    ga("Library");

    var zoom = require("../modules/Zoom");
    var Dialog = require("../modules/Dialog").dialog;
    var ui = require("../modules/Dialog").ui;
    var sketch = require("sketch/dom");
    var SymbolMaster = sketch.SymbolMaster;
    var document = sketch.getSelectedDocument();
    var currentPage = document.selectedPage;
    var libraries = sketch.getLibraries();
    var enabledLibraries = libraries.filter(function(library) {
        return library.enabled == true;
    });
    if (!enabledLibraries.length) { require("sketch/ui").message("You have no available libraries."); return; }
    var enabledLibraryNames = enabledLibraries.map(function(library) {
        return library.name;
    });

    var dialog = new Dialog("Insert Artboard from Library");

    dialog.addLabel("Choose a Library:");
    var libraryView = ui.popupButton(enabledLibraryNames);
    dialog.addView(libraryView);

    dialog.addLabel("Choose a Artboard:");
    var artboardView = ui.popupButton([]);
    dialog.addView(artboardView);

    var selectedLibrary = enabledLibraries[0];
    var artboards = getArtboardsFromLibrary(selectedLibrary);
    loadSelectMenuData(artboardView, artboards);

    libraryView.setCOSJSTargetFunction(function(sender) {
        selectedLibrary = enabledLibraries[sender.indexOfSelectedItem()];
        artboards = getArtboardsFromLibrary(selectedLibrary);
        loadSelectMenuData(artboardView, artboards);
    });

    var responseCode = dialog.run();
    if (responseCode == 1000 && artboards.length) {

        document.selectedLayers.clear();

        var source = artboards[artboardView.indexOfSelectedItem()];
        if (!source) return;
        // Copy into the target document without converting or editing the library.
        var newArtboard = sketch.fromNative(source.sketchObject.copy());
        newArtboard.parent = currentPage;
        var origin = compatibility.originForNewArtboard(currentPage.sketchObject,newArtboard.frame);
        newArtboard.frame.x = origin.x;
        newArtboard.frame.y = origin.y;
        document.selectedLayers = [newArtboard];

        zoom.toSelection();
    }
};

function getArtboardsFromLibrary(library) {
    var sketch = require("sketch/dom");
    var util = require("util");
    var libDocument = library.getDocument();
    return util.toArray(compatibility.artboards(libDocument.sketchObject)).filter(function(artboard) {
        return compatibility.isArtboard(artboard);
    }).map(function(artboard) {
        return sketch.fromNative(artboard);
    });
}

function loadSelectMenuData(popupButton, artboards) {
    var preview = require("../modules/Preview");
    popupButton.removeAllItems();
    artboards.forEach(function(artboard) {
        var menuItem = NSMenuItem.alloc().init();
        var menuTitle = artboard.name;
        var menuImage;
        var artboardNative = artboard.sketchObject;
        menuImage = preview.symbol(artboardNative, 80);
        menuImage.setSize(CGSizeMake(menuImage.size().width / 2, menuImage.size().height / 2));
        menuItem.setImage(menuImage);
        menuItem.setTitle(menuTitle);
        popupButton.menu().addItem(menuItem);
    });
}