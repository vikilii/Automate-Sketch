var onRun = function() {
    var sketch=require("sketch/dom"),UI=require("sketch/ui");
    var document=sketch.getSelectedDocument();
    if(!document || !document.sketchObject.isCloudDoc()) {UI.message("Not a cloud document.");return;}
    var share=document.sketchObject.cloudShare();
    var name=share ? String(share.name()) : "Document";
    var path=require("../modules/System").savePanel(name+".sketch");
    if(!path) return;
    // Save a copy through Sketch, rather than depending on its private cache path.
    document.save(String(path),{saveMode:sketch.Document.SaveMode.SaveTo},function(error){
        if(error) UI.alert("Unable to save local copy",String(error.message || error));
        else UI.message("Local copy saved.");
    });
};
