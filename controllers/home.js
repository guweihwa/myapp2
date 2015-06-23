var sidebar = require('../common/sidebar'),
	  helpers = require('../common/helpers'),
    ImageModel = require('../models').Image;

var log = helpers.log;

module.exports = {
  index: function(req, res) {
  	//log.debug("home index");
    var viewModel = {
       images: {}
    };
    //log.debug("home index 2 ImageModel.find="+ImageModel.find);
    ImageModel.find({}, {}, { sort: { timestamp: -1 }},
      function(err, images) {
      	//log.debug("home index 3");
        if (err) { throw err; }

        //log.debug("home index 4");
        viewModel.images = images;
        sidebar(viewModel, function(viewModel) {
           res.render('index', viewModel);
        });
      });
  }
};
