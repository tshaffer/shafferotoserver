var photosDir = '/Users/tedshaffer/Documents/Projects/shafferoto/server/public';

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var fs = require("fs");
// var sha1 = require('sha1');
var easyImage = require("easyimage");

var dbController = require('./controllers/mongoController');
var openDBPromise = dbController.initialize();

var exifReader = require('./controllers/nodeExif.js');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(express.static(path.join(__dirname, 'public')));

// app.get('/', function(req, res) {
//   res.send('<html><head></head><body><h1>Hello shafferoto!</h1></body></html>');
// });

app.use('/photos', express.static(path.join(__dirname,'/public')));
// app.use('/index.html', express.static(path.join(__dirname,'../../bang/bangaract/index.html')));
app.use('/index.html', express.static(path.join(__dirname, '../../react/shafferototron/index.html')));
app.use('/', express.static(path.join(__dirname, '../../react/shafferototron/')));

// app.get('/index.html', function(req, res) {
//   debugger;
//   // var baseDirName = __dirname;
//   var filePath = path.join(__dirname,'../../bang/bangaract/index.html');
//   fs.readFile(filePath, function (err, data) {
//      console.log("File read complete");
//   });
//
// })

openDBPromise.then(function() {
  var fetchPhotoFoldersPromise = dbController.fetchPhotoFolders();
  fetchPhotoFoldersPromise.then(function(photoFolders) {
    photoFolders.forEach(function(photoFolder, index, array) {
      app.use(express.static(photoFolder.dirName));
    });
  });
});

app.get('/getPhotos', function(req, res) {

  console.log("getPhotos invoked");
  res.set('Access-Control-Allow-Origin', '*');

  var fetchAllPhotosPromise = dbController.fetchAllPhotos();
  fetchAllPhotosPromise.then(function(allPhotos) {
    var response = {};
    response.photos = allPhotos;
    res.send(response);
  });
});


app.get('/queryPhotos', function(req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var querySpec = req.query.querySpec;

  console.log("queryPhotos invoked");

  var queryPhotosPromise = dbController.queryPhotos(querySpec);
  queryPhotosPromise.then(function(photos) {
    var response = {};
    response.photos = photos;
    res.send(response);
  });
});


app.get('/addQuery', function (req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var querySpec = req.query.querySpec;

  console.log("addQuery invoked");

  var addQueryPromise = dbController.saveQueryToDB(querySpec);
  addQueryPromise.then(function() {
    res.send("query added");
  });
});


app.get('/getQueries', function (req, res) {

  console.log("getQueries invoked");
  res.set('Access-Control-Allow-Origin', '*');

  var getQueriesPromise = dbController.getQueries();
  getQueriesPromise.then(function(allQueries) {
    res.send(allQueries);
  });
});


app.get('/getQuery', function (req, res) {

  console.log("getQuery invoked");
  res.set('Access-Control-Allow-Origin', '*');

  var queryName = req.query.queryName;

  var getQueryPromise = dbController.getQuery(queryName);
  getQueryPromise.then(function(query) {
    res.send(query);
  });
});


app.get('/getTags', function(req, res) {

  console.log("getTags invoked");
  res.set('Access-Control-Allow-Origin', '*');

  var fetchAllTagsPromise = dbController.fetchAllTags();
  fetchAllTagsPromise.then(function(allTags) {
    var response = {};
    response.Tags = allTags;
    res.send(response);
  });

});


app.get('/addTag', function (req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var tagLabel = req.query.tagLabel;

  console.log("addTag invoked with parameter " + tagLabel);

  var addTagPromise = dbController.addTagToDB(tagLabel);
  addTagPromise.then(function() {
    res.send("tag added");
  });
});


app.get('/updateTags', function (req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var photosUpdateSpec = req.query.photosUpdateSpec;

  console.log("updateTags invoked");

  dbController.updateTags(photosUpdateSpec);
  res.send("tags updated");
});


app.get('/getAlbums', function(req, res) {

  console.log("getAlbums invoked");
  res.set('Access-Control-Allow-Origin', '*');

  var fetchAllAlbumsPromise = dbController.fetchAllAlbums();
  fetchAllAlbumsPromise.then(function(allAlbums) {
    var response = {};
    response.Albums = allAlbums;
    res.send(response);
  });
});


app.get('/createAlbum', function (req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var albumName = req.query.albumName;

  console.log("createAlbum invoked");

  var addAlbumPromise = dbController.createAlbum(albumName);
  addAlbumPromise.then(function(album) {
    // return all the albums
    var fetchAllAlbumsPromise = dbController.fetchAllAlbums();
    fetchAllAlbumsPromise.then(function(allAlbums) {
      var response = {};
      response.Albums = allAlbums;
      res.send(response);
    });
  });
});


app.get('/addPhotosToAlbum', function (req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var albumId = req.query.albumId;
  var idsOfPhotosToAdd = req.query.photos;

  var addPhotosToAlbumPromise = dbController.addPhotosToAlbum(albumId, idsOfPhotosToAdd);
  addPhotosToAlbumPromise.then(function() {
    res.send("ok");
  })
});


app.get('/getPhotosInAlbum', function(req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var albumId = req.query.albumId;

  console.log("getPhotosInAlbum invoked");

  var getPhotosInAlbumPromise = dbController.getPhotosInAlbum(albumId);
  getPhotosInAlbumPromise.then(function(photos) {
    var response = {};
    response.photos = photos;
    res.send(response);
  });
});


app.get('/addFolder', function (req, res) {

  res.set('Access-Control-Allow-Origin', '*');

  var folder = req.query.folderName[0];
  var baseName = path.basename(folder);
  var dirName = path.dirname(folder);

  console.log("addFolder invoked: ", folder);

  var photosInFolder = [];
  photosOnDrive = findPhotos(folder, photosInFolder, baseName);

  if (photosOnDrive.length > 0) {

    app.use(express.static(dirName));

    // temporarily comment out the code that only looks for new files
    // look for photosOnDrive that aren't in photosInDB
    var photosToAdd = [];
    photosOnDrive.forEach(function (photoOnDrive) {
      // if ( !photosInDB.hasOwnProperty( photoOnDrive.url ) ) {
        photosToAdd.push(photoOnDrive);
      // }
    });

    if (photosToAdd.length > 0) {
      var getExifDataPromise = exifReader.getAllExifData(photosToAdd);
      getExifDataPromise.then(function(photos) {
        console.log("getExifDataPromised resolved");

        var buildThumbnailsPromise = buildThumbnails(photos, baseName);
        buildThumbnailsPromise.then(function(obj) {
          console.log("thumbnails build complete");
          var savePhotosPromise = dbController.savePhotosToDB(photos);
          savePhotosPromise.then(function() {
            var addFolderPromise = dbController.addFolder(folder, baseName, dirName);
            addFolderPromise.then(function() {
              var fetchAllPhotosPromise = dbController.fetchAllPhotos();
              fetchAllPhotosPromise.then(function(allPhotos) {
                var response = {};
                response.photos = allPhotos;
                res.send(response);
              });
            });
          });
        });
      });
    }
  }
})

app.get('/updateDB', function(req, res) {

  console.log("updateDB invoked");
  res.set('Access-Control-Allow-Origin', '*');

// retrieve photos that exist in db; get them in a hash table
  var hashAllPhotosPromise = dbController.hashAllPhotos();
  hashAllPhotosPromise.then(function(photosInDB) {

    console.log('Look for photos in ' + photosDir);
    var photosOnDrive = [];
    photosOnDrive = findPhotos(photosDir, photosOnDrive, "");

    if (photosOnDrive.length > 0) {

      // look for photosOnDrive that aren't in photosInDB
      var photosToAdd = [];
      photosOnDrive.forEach(function (photoOnDrive) {
        if ( !photosInDB.hasOwnProperty( photoOnDrive.url ) ) {
          photosToAdd.push(photoOnDrive);
        }
      });

      if (photosToAdd.length > 0) {
        var getExifDataPromise = exifReader.getAllExifData(photosToAdd);
        getExifDataPromise.then(function(photos) {
          console.log("getExifDataPromised resolved");

          var buildThumbnailsPromise = buildThumbnails(photos, "");
          buildThumbnailsPromise.then(function(obj) {
            console.log("thumbnails build complete");
            dbController.savePhotosToDB(photos);
          });
        });
      }
    }

    res.send("ok");
  });
});


function buildThumbnails(photos, basename) {

  var photoCount = photos.length;

  return new Promise(function(resolve, reject) {

    var sequence = Promise.resolve();

    photos.forEach(function(photo) {
      // Add these actions to the end of the sequence
      sequence = sequence.then(function() {
        return buildThumb(photo, basename);
      }).then(function(photo) {
        photoCount--;
        console.log("photoCount=" + photoCount);
        if (photoCount == 0) {
          resolve(null);
        }
      });
    });
  });
}


function buildThumb(photo, basename) {

  return new Promise(function(resolve, reject) {

    var targetHeight = 250;
    var targetWidth = photo.imageWidth / (photo.imageHeight / targetHeight);

    var dirName = path.dirname(photo.filePath);
    var fileName = path.basename(photo.filePath);
    var ext = path.extname(photo.filePath);

    var thumbFileName = fileName.substring(0,fileName.length - ext.length)+"_thumb" + ext;
    var thumbPathName = path.join(dirName,thumbFileName);

    // photo is the object that is stored in the db
    // photo.thumbUrl = path.relative(photosDir, thumbPathName);
    photo.thumbUrl = path.join(basename, thumbFileName);

    var createThumbPromise = easyImage.resize({
      src: photo.filePath,
      dst: thumbPathName,
      width: targetWidth,
      height: targetHeight,
      quality: 75
    });
    createThumbPromise.then(function (image) {
      // image is the object returned from easyimage
      console.log("created thumbnail " + image.name);
      resolve(image);
    });
  });
}

app.get('/getTaggedPhotos', function(req, res) {
  console.log("specified tag is " + req.query.tag);

  var response = '<html><head></head><body><h1>tag is ' + req.query.tag + '</h1></body></html>';
  res.send(response);
});

var photos = [];

console.log("launch shafferoto");

var photoFileSuffixes = ['jpg'];

function findPhotos(dir, photoFiles, basename) {
  var files = fs.readdirSync(dir);
  photoFiles = photoFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      photoFiles = findPhotos(dir + '/' + file, photoFiles, basename);
    }
    else {
      // save it if it's a photo file but not if it's a thumbnail
      photoFileSuffixes.forEach(function(suffix) {
        if (file.toLowerCase().endsWith(suffix)) {
          var thumbSuffix = "_thumb." + suffix;
          if (!file.toLowerCase().endsWith(thumbSuffix)) {
            var photo = {};
            photo.title = file;

            // photo.url = path.relative(photosDir, filePath);
            photo.url = path.join(basename, file);

            var filePath = path.format({
              root: "/",
              dir: dir,
              base: file,
              ext: "." + suffix,
              name: "file"
            });
            photo.filePath = filePath;

            photo.dateTaken = Date.now();
            photo.orientation = 1;

            photoFiles.push(photo);

            // code that gets sha1
            //fs.readFile(filePath, function (err, data) {
            //  console.log("File read complete");
            //  var sha1 = sha1(data);
            //  console.log(foo);
            //});

          }
        }
      });
    }
  });
  return photoFiles;
};

function handleError(err) {
  console.log("handleError invoked");
  return;
}

// app.use("/SanMateoCoast2013/IMG_7093_thumb.JPG", function(req, res) {
//   debugger;
// });
//
// app.use("file:///SanMateoCoast2013/IMG_7093_thumb.JPG", function(req, res) {
//   debugger;
// });
//
// app.use("/", function(req, res) {
//   debugger;
// });
//
// app.use("file://", function(req, res) {
//   debugger;
// });
//
// app.use("file:///", function(req, res) {
//   debugger;
// });

// var http = require('http');
//
// http.createServer(function(request, response) {
//   var headers = request.headers;
//   var method = request.method;
//   var url = request.url;
//   console.log(url);
//   var body = [];
//   request.on('error', function(err) {
//     console.error(err);
//   }).on('data', function(chunk) {
//     body.push(chunk);
//   }).on('end', function() {
//     body = Buffer.concat(body).toString();
//     // At this point, we have the headers, method, url and body, and can now
//     // do whatever we need to in order to respond to this request.
//   });
// }).listen(3000); // Activates this server, listening on port 8080.

var port = process.env.PORT || 3000;
app.listen(port);
