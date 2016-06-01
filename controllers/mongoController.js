var dbOpened = false;

var mongoose = require('mongoose');
require('datejs');

var photos = [];

var Schema = mongoose.Schema;
var photoSchema = new Schema({
    title:  String,
    path: String,
    url: String,
    dateTaken: Date,
    orientation: Number,
    imageWidth: Number,
    imageHeight: Number,
    tags: [String],
    thumbUrl: String,
    comments: [{ body: String, date: Date }],
});
var Photo = mongoose.model('Photo', photoSchema);

var photoFolderSchema = new Schema({
    path: String,
    baseName: String,
    dirName: String
});
var PhotoFolder = mongoose.model('PhotoFolder', photoFolderSchema);

var albumSchema = new Schema({
    name: String,
    photoIds: [String]
});
var Album = mongoose.model('Album', albumSchema);

var photosQuerySchema = new Schema({
    name:  String,
    tags: [String],
    tagQueryOperator: String,
    dateQueryType: String,
    dateValue: Date,
    startDateValue: Date,
    endDateValue: Date
});

var PhotosQuery = mongoose.model('PhotosQuery', photosQuerySchema);

var tagSchema = new Schema ({
    label: String
});
var Tag = mongoose.model('Tag', tagSchema);

function initialize() {

    return new Promise(function (resolve, reject) {

        mongoose.connect('mongodb://localhost/shafferotoTest');

        var db = mongoose.connection;
        // db.on('error', console.error.bind(console, 'connection error:'));
        db.on('error', function() {
            reject();
        })
        db.once('open', function() {
            console.log("connected to shafferotoTest");
            dbOpened = true;
            resolve();
        });
        
    });
    
}


function fetchAllPhotos() {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            // var cursor =db.collection('restaurants').find( );
            // cursor.each(function(err, doc) {
            //     assert.equal(err, null);
            //     if (doc != null) {
            //         console.dir(doc);
            //     } else {
            //         callback();
            //     }
            // });


            // https://docs.mongodb.com/getting-started/node/query/
            // https://docs.mongodb.com/manual/reference/method/cursor.sort/#cursor.sort

            photos = [];

            // var cursor = db.collection('photos').find({}).sort({dateTaken: -1});
            // cursor.each(function(err, photoDoc) {
            //     if (err) {
            //         console.log("error returned from mongoose query");
            //         reject();
            //     }
            //     if (photoDoc != null) {
            //         photos.push(
            //             {
            //                 id: photoDoc.id,
            //                 title: photoDoc.title,
            //                 dateTaken: photoDoc.dateTaken,
            //                 url: photoDoc.url,
            //                 orientation: photoDoc.orientation,
            //                 width: photoDoc.imageWidth,
            //                 height: photoDoc.imageHeight,
            //                 thumbUrl: photoDoc.thumbUrl,
            //                 tags: photoDoc.tags });
            //     }
            //     else {
            //         resolve(photos);
            //     }
            // });

            // passing options and executing immediately
            // MyModel.find({ name: /john/i }, null, { skip: 10 }, function (err, docs) {});
            Photo.find({}, null, { sort: {dateTaken: -1} }, function (err, photoDocs) {
                if (err) {
                    console.log("error returned from mongoose query");
                    reject();
                }

                photos = [];
                photoDocs.forEach(function (photoDoc) {
                    photos.push(
                        {
                            id: photoDoc.id,
                            title: photoDoc.title,
                            dateTaken: photoDoc.dateTaken,
                            url: photoDoc.url,
                            orientation: photoDoc.orientation,
                            width: photoDoc.imageWidth,
                            height: photoDoc.imageHeight,
                            thumbUrl: photoDoc.thumbUrl,
                            tags: photoDoc.tags });
                });

                resolve(photos);
            });

            //     myCollection.find().sort({date: 1}).limit(50, callback);

            // original implementation without sort
            // Photo.find({}, function (err, photoDocs) {
            //     if (err) {
            //         console.log("error returned from mongoose query");
            //         reject();
            //     }
            //
            //     photos = [];
            //     photoDocs.forEach(function (photoDoc) {
            //         photos.push(
            //             {
            //                 id: photoDoc.id,
            //                 title: photoDoc.title,
            //                 dateTaken: photoDoc.dateTaken,
            //                 url: photoDoc.url,
            //                 orientation: photoDoc.orientation,
            //                 width: photoDoc.imageWidth,
            //                 height: photoDoc.imageHeight,
            //                 thumbUrl: photoDoc.thumbUrl,
            //                 tags: photoDoc.tags });
            //     });
            //
            //     resolve(photos);
            // });
        }
        else {
            reject();
        }
    });
}


function saveQueryToDB(querySpecStr) {

    return new Promise(function( resolve, reject) {

        if (dbOpened) {

            var querySpec = JSON.parse(querySpecStr);

            var tags = [];
            if (querySpec.tagsInQuery.length > 0) {

                var tagsInQuery = [];
                querySpec.tagsInQuery.forEach(function (tagInQuery) {
                    tags.push(tagInQuery.tag);
                });
            }

            var queryForDB = new PhotosQuery({
                name: querySpec.name,
                tags: tags,
                tagQueryOperator: querySpec.tagQueryOperator,
                dateQueryType: querySpec.dateQueryType,
                dateValue: new Date(querySpec.dateValue),
                startDateValue: new Date(querySpec.startDateValue),
                endDateValue: new Date(querySpec.endDateValue)
            });

            queryForDB.save(function (err) {
                if (err) reject(err);

                resolve();
            });

            console.log("query saved");
        }
        else {
            reject();
        }
    });
}

function queryPhotos(querySpecStr) {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            var querySpec = JSON.parse(querySpecStr);

            var queryIncludesDateComponent = true;
            var queryIncludesTags = true;

            var dateTakenQueryFragment = {};

            switch (querySpec.dateQueryType) {
                case "before":
                    dateTakenQueryFragment.$lt = new Date(querySpec.dateValue);
                    break;
                case "after":
                    dateTakenQueryFragment.$gt = new Date(querySpec.dateValue);
                    break;
                case "on":
                    var startDate = new Date(querySpec.dateValue);
                    startDate.clearTime();

                    var endDate = new Date(querySpec.dateValue);
                    endDate.clearTime().addDays(1);

                    dateTakenQueryFragment.$gt = startDate;
                    dateTakenQueryFragment.$lt = endDate;
                    break;
                case "between":
                    dateTakenQueryFragment.$gt = new Date(querySpec.startDateValue);
                    dateTakenQueryFragment.$lt = new Date(querySpec.endDateValue);
                    break;
                default:
                    queryIncludesDateComponent = false;
                    break;
            }

            var tagsInQueryFragment = {};
            if (typeof querySpec.tagsInQuery == "object" && Array.isArray(querySpec.tagsInQuery) && (querySpec.tagsInQuery.length > 0)) {

                var tagsInQuery = [];
                querySpec.tagsInQuery.forEach(function (tagInQuery) {
                    tagsInQuery.push(tagInQuery.tag);
                });

                if (querySpec.tagQueryOperator == 'or') {
                    tagsInQueryFragment.$in = tagsInQuery;
                }
                else {
                    tagsInQueryFragment.$all = tagsInQuery;
                }
            }
            else {
                queryIncludesTags = false;
            }

            var photos = [];

            var photoQuery = {};
            if (queryIncludesDateComponent && queryIncludesTags) {
                var queryFragments = [];

                var dateTakenQuerySnippet = {};
                dateTakenQuerySnippet.dateTaken = dateTakenQueryFragment;
                queryFragments.push(dateTakenQuerySnippet);

                var tagsQuerySnippet = {};
                tagsQuerySnippet.tags = tagsInQueryFragment;
                queryFragments.push(tagsQuerySnippet);

                photoQuery.$and = queryFragments;
            }
            else if (queryIncludesDateComponent){
                photoQuery.dateTaken = dateTakenQueryFragment;
            }
            else if (queryIncludesTags) {
                photoQuery.tags = tagsInQueryFragment;
            }

            Photo.find( photoQuery, function(err, photoDocs) {
                if (err) {
                    console.log("error returned from mongoose in queryPhotos");
                    reject();
                }

                photos = [];
                photoDocs.forEach(function (photoDoc) {
                    photos.push(
                        {
                            id: photoDoc.id,
                            title: photoDoc.title,
                            dateTaken: photoDoc.dateTaken,
                            url: photoDoc.url,
                            orientation: photoDoc.orientation,
                            width: photoDoc.imageWidth,
                            height: photoDoc.imageHeight,
                            thumbUrl: photoDoc.thumbUrl,
                            tags: photoDoc.tags });
                });

                resolve(photos);
            });
        }
        else {
            reject();
        }
    });
}



function hashAllPhotos() {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            Photo.find({}, function (err, photoDocs) {
                if (err) {
                    console.log("error returned from mongoose query");
                    reject();
                }

                var hashedPhotos = {};
                photoDocs.forEach(function (photoDoc) {
                    hashedPhotos[photoDoc.url] = true;
                });

                resolve(hashedPhotos);
            });
        }
        else {
            reject();
        }
    });
}


function savePhotosToDB(photos) {

    return new Promise(function (resolve, reject) {
        
        photos.forEach(function(photo) {

            var photoForDB = new Photo({
                title: photo.title,
                path: photo.filePath,
                url: photo.url,
                tags: [],
                dateTaken: photo.dateTaken,
                orientation: photo.orientation,
                imageWidth: photo.imageWidth,
                imageHeight: photo.imageHeight,
                thumbUrl: photo.thumbUrl
            });

            photoForDB.save(function (err) {
                if (err) return handleError(err);
            });
        });

        console.log("all photos submitted to save engine");

        resolve();
    })
}


function getQueries() {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            PhotosQuery.find({}, function (err, queries) {
                if (err) {
                    console.log("error returned from mongoose query");
                    reject();
                }

                resolve(queries);
            });
        }
        else {
            reject();
        }
    });
}

function getQuery(queryName) {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            PhotosQuery.findOne({ name: queryName }, function (err, query) {
                if (err) {
                    console.log("error returned from mongoose query");
                    reject();
                }

                resolve(query);
            });
        }
        else {
            reject();
        }
    });
}


function fetchAllTags() {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            var tags = [];

            Tag.find({}, function (err, dbTags) {
                if (err) {
                    console.log("error returned from mongoose query");
                    reject();
                }

                dbTags.forEach(function (tagDoc) {
                    // tags.push({label: tagDoc.label});
                    tags.push({id: tagDoc.id, name: tagDoc.label})
                });

                resolve(tags);
            });
        }
        else {
            reject();
        }
    });
};


function addTagToDB(tagLabel) {

    return new Promise(function (resolve, reject) {

        var tagForDB = new Tag({
            label: tagLabel
        });

        tagForDB.save(function (err) {
            if (err) {
                reject(err);
            }
            console.log("tag saved in db");
            resolve();
        });
    });

}


function updateTags(photosUpdateSpec) {

    var photosToUpdate = [];

    if (typeof photosUpdateSpec == "object") {
        photosUpdateSpec.forEach(function (photoUpdateSpec) {
            var photoToUpdate = JSON.parse(photoUpdateSpec);
            photosToUpdate.push(photoToUpdate);
        })
    }
    else {
        var photoUpdateSpec = JSON.parse(photosUpdateSpec);
        photosToUpdate.push(photoUpdateSpec);
    }

    photosToUpdate.forEach(function (photoToUpdate) {

        var id = photoToUpdate.id;
        var tags = photoToUpdate.tags;

        // for now, go ahead and try to do all of these immediately
        Photo.update({_id: id}, {$set: {tags: tags}}, function(err) {
            console.log("update complete, err = " + err);
        });
    });
}

function fetchAllAlbums() {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            var albums = [];

            Album.find({}, function (err, dbAlbums) {
                if (err) {
                    console.log("error returned from mongoose query");
                    reject();
                }

                dbAlbums.forEach(function (albumDoc) {
                    albums.push({ name: albumDoc.name, id: albumDoc.id });
                });

                resolve(albums);
            });
        }
        else {
            reject();
        }
    });
};



function createAlbum(albumName) {

    return new Promise(function (resolve, reject) {
        var albumForDB = new Album({
            name: albumName,
            photoIds: []
        });

        albumForDB.save(function (err, doc) {
            if (err) {
                reject(err);
            }
            console.log("album created in db, id=", doc.id);
            resolve(doc);
        })
    })
}

function addPhotosToAlbum(albumId, photoIds) {

    // need to get photoIds for the current album and append them
    // see updateTags

    return new Promise(function(resolve, reject) {

        // from stackOverflow
        // http://stackoverflow.com/questions/11963684/how-to-push-an-array-of-objects-into-an-array-in-mongoose-with-one-call?rq=1
        // var Kitten = db.model('Kitten', kittySchema);
        // Kitten.update({name: 'fluffy'},{$pushAll: {values:[2,3]}},{upsert:true},function(err){
        //     if(err){
        //         console.log(err);
        //     }else{
        //         console.log("Successfully added");
        //     }
        // });

        // NB: you may also want to look at $addToSet, which can be used to only add values to an array if they aren't there already. – Stennie Aug 15 '12 at 3:39

        // Kitten.update({name: 'fluffy'}, {$push: {values: {$each: [2,3]}}}, {upsert:true}, function(err){
        //     if(err){
        //         console.log(err);
        //     }else{
        //         console.log("Successfully added");
        //     }
        // });

        Album.update({_id: albumId}, {$push: {photoIds: {$each: photoIds}}}, {upsert:true}, function (err) {
            if (err) reject(err);
            resolve();
        });
    })
}

function getPhotosInAlbum(albumId) {

    // https://docs.mongodb.com/master/reference/operator/aggregation/lookup/#pipe._S_lookup

    // http://stackoverflow.com/questions/34967482/lookup-on-objectids-in-an-array

    // aggregate.lookup({ from: 'users', localField: 'userId', foreignField: '_id', as: 'users' });

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            var photos = [];

            // initial implementation does not use join
            // get the photo id's in an album
            Album.findById(albumId, function (err, album) {
                if (err) reject();

                var photosToRetrieve = album.photoIds.length;
                var photosRetrieved = 0;

                album.photoIds.forEach(function(photoId, index, array) {
                    console.log("Album contains photo with id:", photoId);
                    Photo.findById(photoId, function(err, photo) {
                        if (err) reject();
                        photos.push({
                            id: photo.id,
                            title: photo.title,
                            dateTaken: photo.dateTaken,
                            url: photo.url,
                            orientation: photo.orientation,
                            width: photo.imageWidth,
                            height: photo.imageHeight,
                            thumbUrl: photo.thumbUrl,
                            tags: photo.tags });

                        photosRetrieved++;
                        if (photosToRetrieve == photosRetrieved) {
                            resolve(photos);
                        }
                    });
                });
            });
        }
        else {
            reject();
        }
    });
}

function addFolder(path, baseName, dirName) {

    return new Promise(function (resolve, reject) {

        var folderForDB = new PhotoFolder({
            path: path,
            baseName: baseName,
            dirName: dirName
        });

        folderForDB.save(function (err) {
            if (err) {
                reject(err);
            }
            console.log("photo folder saved in db");
            resolve();
        });
    });

}

function fetchPhotoFolders() {

    return new Promise(function (resolve, reject) {

        if (dbOpened) {

            var photoFolders = [];

            PhotoFolder.find({}, function (err, dbPhotoFolders) {
                if (err) {
                    console.log("error returned from mongoose query");
                    reject();
                }

                dbPhotoFolders.forEach(function (photoFolderDoc) {
                    photoFolders.push({
                        path: photoFolderDoc.path,
                        baseName: photoFolderDoc.baseName,
                        dirName: photoFolderDoc.dirName
                    })
                });

                resolve(photoFolders);
            });
        }
        else {
            reject();
        }
    });
}

function handleError(err) {
    console.log("handleError invoked");
    return;
}

module.exports = {
    initialize: initialize,
    fetchAllPhotos: fetchAllPhotos,
    hashAllPhotos: hashAllPhotos,
    savePhotosToDB: savePhotosToDB,
    fetchAllTags: fetchAllTags,
    addTagToDB: addTagToDB,
    updateTags: updateTags,
    queryPhotos: queryPhotos,
    saveQueryToDB: saveQueryToDB,
    getQueries: getQueries,
    getQuery: getQuery,
    fetchAllAlbums: fetchAllAlbums,
    createAlbum: createAlbum,
    addPhotosToAlbum: addPhotosToAlbum,
    getPhotosInAlbum: getPhotosInAlbum,
    addFolder: addFolder,
    fetchPhotoFolders: fetchPhotoFolders
}
