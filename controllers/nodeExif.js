/**
 * Created by tedshaffer on 3/17/16.
 */
//https://github.com/gomfunkel/node-exif
var ExifImage = require('exif').ExifImage;

// http://www.html5rocks.com/en/tutorials/es6/promises/#toc-chaining
function getAllExifData(photos) {

    console.log("num photos is " + photos.length);
    var photoCount = photos.length;

    var photosWithExifData = [];

    return new Promise(function(resolve, reject) {

        var sequence = Promise.resolve();

        photos.forEach(function(photo) {
            // Add these actions to the end of the sequence
            sequence = sequence.then(function() {
                return getExifData(photo);
            }).then(function(photo) {
                photosWithExifData.push(photo);
                photoCount--;
                console.log("photoCount=" + photoCount);
                if (photoCount == 0) {
                    resolve(photosWithExifData);
                }
            });
        });
    });
}

var getExifData = function getExifData(photo) {

    return new Promise(function(resolve, reject) {

        var filePath = photo.filePath;

        try {
            console.log("invoke exifImage for the file at: " + filePath);
            new ExifImage({ image : filePath }, function (error, exifData) {
                if (error) {
                    //TODO need to continue on when this happens - this will definitely happen as I have photos with no exif data
                    console.log("error returned from ExifImage");
                    console.log('Error: '+ error.message);
                    resolve(null);
                }
                else {
                    console.log("return from ExifImage");
                    var imageWidth = 0;
                    var imageHeight = 0;
                    if (typeof exifData.exif.ExifImageWidth == "number" && typeof exifData.exif.ExifImageHeight == "number") {
                        imageWidth = exifData.exif.ExifImageWidth;
                        imageHeight = exifData.exif.ExifImageHeight;
                    }
                    console.log(exifData.exif.ExifImageWidth.toString() + " " + exifData.exif.ExifImageHeight.toString());
                    photo.imageWidth = imageWidth;
                    photo.imageHeight = imageHeight;

                    var dateTaken;
                    if (typeof exifData.exif.DateTimeOriginal == 'undefined') {
                        dateTaken = Date.now();
                    }
                    else
                    {
                        dateTaken = parseDate(exifData.exif.DateTimeOriginal);
                    }
                    photo.dateTaken = dateTaken;

                    var orientation;
                    if (typeof exifData.image.Orientation == 'undefined') {
                        orientation = 1;
                    }
                    else {
                        orientation = exifData.image.Orientation;
                    }
                    photo.orientation = orientation;

                    resolve(photo);
                }
            });
        } catch (error) {
            console.log('Error: ' + error.message);
            reject();
        }
    });
}


function parseDate(dateIn) {

    // date input format looks like:
    //    2014:03:23 14:47:32

    var dateOut = new Date();
    dateOut.setFullYear(Number(dateIn.substring(0,4)));
    dateOut.setMonth(Number(dateIn.substring(5, 7)) - 1);
    dateOut.setDate(Number(dateIn.substring(8, 10)));
    dateOut.setHours(Number(dateIn.substring(11, 13)));
    dateOut.setMinutes(Number(dateIn.substring(14, 16)));
    dateOut.setSeconds(Number(dateIn.substring(17, 19)));
    console.log(dateOut.toString());
    return dateOut;
}



module.exports = {
    getAllExifData: getAllExifData
}
