// Capture to a file: sequential reads from two pipes can deadlock on a full pipe.
module.exports = function(command, args, callback) {
    var manager = NSFileManager.defaultManager();
    var path = String(NSTemporaryDirectory()) + "automate-" + NSUUID.UUID().UUIDString() + ".log";
    manager.createFileAtPath_contents_attributes(path,NSData.data(),null);
    var handle = NSFileHandle.fileHandleForWritingAtPath(path);
    try {
        var task = NSTask.alloc().init();
        task.setLaunchPath(command);
        task.setArguments(args || []);
        task.setStandardOutput(handle);
        task.setStandardError(handle);
        task.launch();
        task.waitUntilExit();
        handle.closeFile();
        handle = null;
        var output = String(NSString.stringWithContentsOfFile_encoding_error(path,NSUTF8StringEncoding,null) || "");
        var success = task.terminationStatus() === 0;
        if (typeof callback === "function") return callback(success,output);
        if (!success) throw new Error(output || "Command failed: " + command);
        return output;
    } finally {
        if (handle) handle.closeFile();
        manager.removeItemAtPath_error(path,null);
    }
};
