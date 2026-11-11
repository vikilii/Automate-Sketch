var compatibility = require("../modules/Compatibility");
var onRun = function(context) {

    var ga = require("../modules/Google_Analytics");
    ga("Utilities");

    var Dialog = require("../modules/Dialog").dialog;
    var sketch = require("sketch");
    var version = compatibility.version;

    var document = context.document;
    var selection = context.selection;
    var layer = selection.firstObject();
    if (!layer) {
        document.showMessage("Please select a bitmap layer.");
        return;
    } else {
        if (layer.class() != "MSBitmapLayer") {
            document.showMessage("Please select a bitmap layer.");
            return;
        }
    }
    var image = NSImage.alloc().initWithData(sketch.fromNative(layer).image.nsdata);
    if (!image || image.size().width < 3 || image.size().height < 3) {
        document.showMessage("Nine-slice requires an image at least 3 × 3 pixels.");
        return;
    }
    var pixels = NSBitmapImageRep.imageRepWithData(sketch.fromNative(layer).image.nsdata);
    if (pixels) image.setSize(NSMakeSize(pixels.pixelsWide(),pixels.pixelsHigh()));
    var imageWidth = image.size().width;
    var imageHeight = image.size().height;
    var layerWidth = layer.frame().width();
    var layerHeight = layer.frame().height();
    var layerScale = layerWidth / imageWidth;
    var layerScaleY = layerHeight / imageHeight;

    // Dialog
    var dialog = new Dialog(
        "Nine-Slice from Bitmap Layer",
        "Crop bitmap layer to 9 part with resizing constraint settings."
    );

    var thumbWidth = 200;
    var thumbHeight = Math.round(200 * imageHeight / imageWidth);
    if (imageHeight > imageWidth) {
        thumbWidth = Math.round(200 * imageWidth / imageHeight);
        thumbHeight = 200;
    }
    var thumbScale = thumbWidth / imageWidth;

    // Resize NSImage
    var originalImage = image.copy();
    var thumbSize = CGSizeMake(thumbWidth, thumbHeight);
    originalImage.setScalesWhenResized(true);
    var resizedImage = NSImage.alloc().initWithSize(thumbSize);
    resizedImage.lockFocus();
    originalImage.setSize(thumbSize);
    NSGraphicsContext.currentContext().setImageInterpolation(NSImageInterpolationNone);
    originalImage.drawAtPoint_fromRect_operation_fraction(NSZeroPoint, CGRectMake(0, 0, thumbSize.width, thumbSize.height), NSCompositeCopy, 1);
    resizedImage.unlockFocus();

    // Thumb view
    var imageWrapper = NSView.alloc().initWithFrame(NSMakeRect(0, 0, thumbWidth, thumbHeight));
    imageWrapper.setFlipped(true);
    var imageView = NSImageView.alloc().initWithFrame(NSMakeRect(0, 0, thumbWidth, thumbHeight));
    var backgroundImage = NSImage.alloc().initWithContentsOfURL(context.plugin.urlForResourceNamed("bg_alpha.png"));
    imageView.setWantsLayer(true);
    imageView.setBackgroundColor(NSColor.colorWithPatternImage(backgroundImage));
    imageView.setImage(resizedImage);

    // Add red lines
    var lineLeft = lineView(Math.round(thumbWidth / 3), 0, 1, thumbHeight);
    var lineRight = lineView(Math.round(thumbWidth / 3 * 2), 0, 1, thumbHeight);
    var lineTop = lineView(0, Math.round(thumbHeight / 3), thumbWidth, 1);
    var lineBottom = lineView(0, Math.round(thumbHeight / 3 * 2), thumbWidth, 1);
    imageWrapper.addSubview(imageView);
    imageWrapper.addSubview(lineLeft);
    imageWrapper.addSubview(lineRight);
    imageWrapper.addSubview(lineTop);
    imageWrapper.addSubview(lineBottom);
    dialog.addView(imageWrapper);

    // Slidebars
    var slideBarLeft = sliderBarView("Left: " + Math.round(imageWidth / 3), imageWidth, Math.round(imageWidth / 3));
    var slideBarRight = sliderBarView("Right: " + Math.round(imageWidth / 3 * 2), imageWidth, Math.round(imageWidth / 3 * 2));
    var slideBarTop = sliderBarView("Top: " + Math.round(imageHeight / 3), imageHeight, Math.round(imageHeight / 3));
    var slideBarBottom = sliderBarView("Bottom: " + Math.round(imageHeight / 3 * 2), imageHeight, Math.round(imageHeight / 3 * 2));
    dialog.addView(slideBarLeft.container);
    dialog.addView(slideBarRight.container);
    dialog.addView(slideBarTop.container);
    dialog.addView(slideBarBottom.container);

    slideBarLeft.slider.setCOSJSTargetFunction(function(sender) {
        restrictValue(sender, 0, slideBarRight.slider.intValue());
        slideBarLeft.label.setStringValue(`Left: ${sender.intValue()}`);
        lineLeft.setFrameOrigin(CGPointMake(Math.round(sender.intValue() * thumbScale), 0));
    });
    slideBarRight.slider.setCOSJSTargetFunction(function(sender) {
        restrictValue(sender, slideBarLeft.slider.intValue(), imageWidth);
        slideBarRight.label.setStringValue(`Right: ${sender.intValue()}`);
        lineRight.setFrameOrigin(CGPointMake(Math.round(sender.intValue() * thumbScale), 0));
    });
    slideBarTop.slider.setCOSJSTargetFunction(function(sender) {
        restrictValue(sender, 0, slideBarBottom.slider.intValue());
        slideBarTop.label.setStringValue(`Top: ${sender.intValue()}`);
        lineTop.setFrameOrigin(CGPointMake(0, Math.round(sender.intValue() * thumbScale)));
    });
    slideBarBottom.slider.setCOSJSTargetFunction(function(sender) {
        restrictValue(sender, slideBarTop.slider.intValue(), imageHeight);
        slideBarBottom.label.setStringValue(`Bottom: ${sender.intValue()}`);
        lineBottom.setFrameOrigin(CGPointMake(0, Math.round(sender.intValue() * thumbScale)));
    });

    var responseCode = dialog.run();
    if (responseCode == 1000) {

        //     L   R      resizingConstraint
        //   1 | 2 | 3    9  | 10 | 12
        // T ---------    ------------
        //   4 | 5 | 6    17 | 18 | 20
        // B ---------    ------------
        //   7 | 8 | 9    33 | 34 | 36

        var left = slideBarLeft.slider.intValue(),
            right = slideBarRight.slider.intValue(),
            top = slideBarTop.slider.intValue(),
            bottom = slideBarBottom.slider.intValue();

        if (!(left > 0 && right > left && right < imageWidth && top > 0 && bottom > top && bottom < imageHeight)) {
            document.showMessage("Keep all nine regions at least one pixel wide and high.");
            return;
        }
        var group = MSLayerGroup.alloc().initWithFrame(layer.frame().rect());

        var xs=[0,left,right,imageWidth],ys=[0,top,bottom,imageHeight];
        var constraints=[9,10,12,17,18,20,33,34,36];
        for(var row=0;row<3;row++) {
            for(var column=0;column<3;column++) {
                var x=xs[column]*layerScale,y=ys[row]*layerScaleY;
                var width=(xs[column+1]-xs[column])*layerScale;
                var height=(ys[row+1]-ys[row])*layerScaleY;
                var partImage=crop(image,xs[column],ys[row],xs[column+1]-xs[column],ys[row+1]-ys[row]);
                var part=new sketch.Image({parent:sketch.fromNative(group),name:String(row*3+column+1),frame:{x:x,y:y,width:width,height:height},image:partImage.data()});
                part.sketchObject.setResizingConstraint(constraints[row*3+column]);
            }
        }

        layer.parentGroup().addLayer(group);
        var wrapped=sketch.fromNative(group),source=sketch.fromNative(layer);
        wrapped.name=source.name+" (9-slice)";
        wrapped.index=source.index+1;
        wrapped.transform=source.transform;

        group.select_byExtendingSelection(true, false);

    }

};

function lineView(x, y, w, h) {
    var view = NSView.alloc().initWithFrame(NSMakeRect(x, y, w, h));
    view.setWantsLayer(true);
    view.layer().setBackgroundColor(CGColorCreateGenericRGB(1, 0, 0, 0.8));
    return view;
}

function sliderBarView(lebal, maxValue, initValue) {
    var view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, 300, 20));

    var sliderView = NSSlider.alloc().initWithFrame(NSMakeRect(0, 0, 200, 20));
    sliderView.setMaxValue(maxValue);
    sliderView.setMinValue(0);
    sliderView.setIntValue(initValue);

    var textView = NSTextField.alloc().initWithFrame(NSMakeRect(210, 0, 90, 20));
    textView.setStringValue(lebal);
    textView.setTextColor(NSColor.blackColor());
    textView.setBezeled(false);
    textView.setDrawsBackground(false);
    textView.setEditable(false);
    textView.setSelectable(false);

    view.addSubview(textView);
    view.addSubview(sliderView);

    return { container: view, label: textView, slider: sliderView };
}

function restrictValue(sliderView, minValue, maxValue) {
    var value = sliderView.intValue();
    if (value <= minValue) {
        value = minValue + 1;
    }
    if (value >= maxValue) {
        value = maxValue - 1;
    }
    sliderView.setIntValue(value);
}

function crop(nsimage, x, y, w, h) {
    var originalImage = nsimage.copy();
    var image = NSImage.alloc().initWithSize(NSMakeSize(w, h));
    image.lockFocus();
    originalImage.drawInRect_fromRect_operation_fraction(
        NSMakeRect(0, 0, w, h),
        NSMakeRect(x, originalImage.size().height - h - y, w, h),
        NSCompositeCopy,
        1.0
    );
    image.unlockFocus();
    return MSImageData.alloc().initWithImage(image);
}
