var onRun = function(context) {
    var workspace=NSWorkspace.sharedWorkspace();
    var terminal=workspace.URLForApplicationWithBundleIdentifier("com.apple.Terminal");
    if(!terminal) return;
    var options=NSWorkspaceOpenConfiguration.configuration();
    var file=context.document && context.document.fileURL();
    if(file) {
        var folder=file.URLByDeletingLastPathComponent();
        workspace.openURLs_withApplicationAtURL_configuration_completionHandler([folder],terminal,options,null);
    } else workspace.openApplicationAtURL_configuration_completionHandler(terminal,options,null);
};
