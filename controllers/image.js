var fs = require('fs'),
    path = require('path');
    //inspect = require('util').inspect;

var md5 = require('MD5');
var async = require('async');

var sidebar = require('../common/sidebar');
var helpers = require('../common/helpers');
var Models = require('../models');

var log = helpers.log;

module.exports = {
    index: function(req, res) {
        //res.send('The image:index controller ' + req.params.image_id);
        var viewModel = {
            image: {},
            comments: []
        };

        Models.Image.findOne({ filename: { $regex: req.params.image_id } },
            function(err, image) {
                if (err) { throw err; }
                if (image) {
                    image.views = image.views + 1;
                    viewModel.image = image;
                    image.save();
                    Models.Comment.find({ image_id: image._id}, {}, { sort: { 'timestamp': 1 }}, 
                        function(err, comments){
                            if (err) { throw err; }

                            viewModel.comments = comments;

                            sidebar(viewModel, function(viewModel) {
                                res.render('image', viewModel);
                            });
                        }
                    );
                                
                } else {
                    res.redirect('/');
                } 
            });
    },
    create: function(req, res) {
        //res.send('The image:create POST controller');
        //res.redirect('/images/1');    

        var saveImage = function() {
            var possible = 'abcdefghijklmnopqrstuvwxyz0123456789',
                imgUrl = '';

            for(var i=0; i < 6; i+=1) {
                imgUrl += possible.charAt(Math.floor(Math.random() * possible.length));
            }

            // search for an image with the same filename by performing a find:
            Models.Image.find({ filename: imgUrl }, function(err, images) {
                if (images.length > 0) {
                    // if a matching image was found, try again (start over):
                    saveImage();
                } else {
                    //log.debug(req);
                    var fstream;
                    var fieldObj = { title: '', description: ''};
                    
                    req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
                      log.debug('Field [' + fieldname + ']: value: ' + val);
                      fieldObj[fieldname] = val;
                    });
                    req.busboy.on('file', function (fieldname, file, filename) {
                        if (!filename) {
                          res.end("Please specify file to be uploaded.");
                          return;
                        }
                         
                        var tempPath = file.path;
                        log.info("Uploading: " + filename + " fieldObj="+ fieldObj);
                        var ext = path.extname(filename).toLowerCase();
                        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif') {
                            var targetPath = path.resolve('./public/upload/' + imgUrl + ext);
                            fstream = fs.createWriteStream(targetPath);
                            log.debug('targetPath='+targetPath);
                            file.pipe(fstream);
                            //log.debug('after pipe');
                            fstream.on('close', function () {
                                log.debug('onClose fieldObj='+fieldObj);
                                // create a new Image model, populate its details:
                                var newImg = new Models.Image({
                                   title: fieldObj.title,
                                   filename: imgUrl + ext,
                                   description: fieldObj.description
                                });
                               // and save the new Image
                               newImg.save(function(err, image) {
                                   res.redirect('/images/' + image.uniqueId);
                               });
                            });            
                        } else {
                            //fs.unlink(tempPath, function (){
                            //    if (err) throw err;
                                res.status(500).json( {error: 'Only image files are allowed.'})
                            //});
                        }
                    });

                    req.busboy.on('finish', function() {
                      log.debug('Done parsing form!');
                      //res.writeHead(303, { Connection: 'close', Location: '/' });
                      //res.end();
                    });

                    req.pipe(req.busboy);
                }
            });

        };

        saveImage();
    },
    like: function(req, res) {
        Models.Image.findOne({ filename: { $regex: req.params.image_id } },
            function(err, image) {
                if (!err && image) {
                    image.likes = image.likes + 1;
                    image.save(function(err) {
                        if (err) {
                            res.json(err);
                        } else {
                            res.json({ likes: image.likes });
                        }
                    });
                }
            });
    },
    comment: function(req, res) {
        var fieldObj = {};
        req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
          log.debug('Field [' + fieldname + ']: value: ' + val);
          fieldObj[fieldname] = val;
        });
        req.busboy.on('finish', function() {
          log.debug('Done parsing form! fieldObj.name='+ fieldObj.name 
            + " req.params-");
          log.debug(req.params);
          Models.Image.findOne({ filename: { $regex: req.params.image_id } },
            function(err, image) {
                if (!err && image) {
                    var newComment = new Models.Comment(fieldObj);
                    newComment.gravatar = md5(newComment.email);
                    newComment.image_id = image._id;
                    newComment.save(function(err, comment) {
                        if (err) { throw err; }

                        res.redirect('/images/' + image.uniqueId + '#' + comment._id);
                    });
                } else {
                    res.redirect('/');
                }
            });
        });      
       
       req.pipe(req.busboy);
    },
    remove: function(req, res) {
        var image;
        var mylog = log;
        async.series([
            function(callback) {
                Models.Image.findOne({ filename: { $regex: req.params.image_id } },
                    function(err, imageObj) {
                        mylog.debug("Remove - err="+err + " imageObj=" + imageObj);
                        if (err) {                            
                            return callback(err);
                        }

                        image = imageObj;
                        mylog.debug("Remove - get image="+image);
                        callback(err);
                    });
            },
            function(callback) {
                fs.unlink(path.resolve('./public/upload/' + image.filename), 
                    function(err) {
                        mylog.debug("Remove - delete file:" + image.filename);
                        callback(err);
                    });
            }, 
            function(callback) {
                Models.Comment.remove({ image_id: image._id}, 
                    function(err) {
                        mylog.debug("Remove - delete Comments for image._id="+ image._id);
                        callback(err);
                    });

            }, 
            function(callback) {
                image.remove(function(err) {  
                    mylog.debug("Remove - delete Image for image._id="+ image._id)
                    callback(err);                  
                });
            }
        ], function(err) {
            log.debug("Remove Series end - err="+err + " image=" + image);
            if (!err) {
                res.json(true);
            } else {
                res.json(false);
            }
        });

        // Models.Image.findOne({ filename: { $regex: req.params.image_id } },
        //     function(err, image) {
        //         if (err) { throw err; }

        //         fs.unlink(path.resolve('./public/upload/' + image.filename), 
        //             function(err) {
        //                 if (err) { throw err; }

        //                 Models.Comment.remove({ image_id: image._id}, 
        //                     function(err) {
        //                         image.remove(function(err) {
        //                             if (!err) {
        //                                 res.json(true);
        //                             } else {
        //                                 res.json(false);
        //                             }
        //                         });
        //                 });
        //         });
        //     });
    }
};
