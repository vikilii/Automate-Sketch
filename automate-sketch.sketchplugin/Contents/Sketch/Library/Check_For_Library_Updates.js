var onRun = function(context) {
    var controller=AppController.sharedInstance().librariesController();
    controller.checkForRemoteAssetLibraryUpdates();
    if(context.document) controller.checkForRemoteAssetLibraryUpdatesForDocumentWithIdentifier(context.document.documentData().objectID());
    require("sketch/ui").message("Checking for library updates.");
};
