module.exports = require('bindings')({
  module_root: __dirname,
  bindings: 'hdrloader'
});
var convnetjs = require("convnetjs");
var fs = require('fs');

var train_iteration = 300;
var train_kernel_width = 1;
var train_kernel_height = 1;
var train_kernel_channel = 2;

function readHDR(hdr_path) {
  var hdr_loader = module.exports.hdrloader();
  var hdr_data = hdr_loader.loadHDR(hdr_path, train_kernel_width, train_kernel_height);
  var hdr_width = hdr_data.readInt32LE(0);
  var hdr_height = hdr_data.readInt32LE(4);
  var hdr_buff = [];
  
  for (i = 0 ; i < hdr_width * hdr_height * train_kernel_channel ; ++i) {
    hdr_buff.push(hdr_data.readFloatLE(8 + 4 * i));
  }
  return { 'width': hdr_width, 'height': hdr_height, 'data': hdr_buff };
}

function getHDRs(hdr_dir, recursive) {
  var results = [];
  var list = fs.readdirSync(hdr_dir);
  
  list.forEach(function(file) {
      var filename = hdr_dir + '/' + file;
      var stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
	if (recursive)
	  results = results.concat(getHDRs(file));
      } else {
	var last_dot_index = filename.lastIndexOf('.');
	if (filename.substr(last_dot_index) == ".hdr")
	  results.push(filename);
      }
  })
  return results;
}

function generateNet(kernel_width, kernel_height, kernel_channel) {
  var layer_defs = [];
  layer_defs.push({type:'input', out_sx:train_kernel_width, out_sy:kernel_height, out_depth:kernel_channel});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'regression', num_neurons:1});
  var net = new convnetjs.Net();
  net.makeLayers(layer_defs);
  return net;
}

function fillVol(raw_data, kernel_width, kernel_height, kernel_channel) {
   var vol = new convnetjs.Vol(kernel_width, kernel_height, kernel_channel, 0.0);
   vol.w = raw_data;
   return vol;
}

function makeDataset(hdr_dir, kernel_width, kernel_height, kernel_channel) {
  var training_list = getHDRs(hdr_dir, false);
  var data = [];
  var labels = [];
  for (var hdr_file_index in training_list) {
    var hdr_file_name = training_list[hdr_file_index];
    var hdr_file_loaded = readHDR(hdr_file_name);
    var x = fillVol(hdr_file_loaded.data, kernel_width, kernel_height, kernel_channel);
    var y = parseFloat(100.0); // TODO : fix me
    data.push(x);
    labels.push(y);
    console.log(hdr_file_name + ' has been processed.');
  }
  
  // prepare the dataset
  var dataset = {};
  dataset.data = data;
  dataset.labels = labels;
  return dataset;
}

function trainHDRs(hdr_dir) {
  var net = generateNet(train_kernel_width, train_kernel_height, train_kernel_channel);
  var trainer = new convnetjs.SGDTrainer(net, {learning_rate:0.01, momentum:0.0, batch_size:1, l2_decay:0.001});
  var dataset = makeDataset(hdr_dir, train_kernel_width, train_kernel_height, train_kernel_channel);
  for (var iteration = 0 ; iteration < train_iteration ; iteration++) {
    for (var data_set_index in dataset.data) {
        var m = trainer.train(dataset.data[data_set_index], dataset.labels[data_set_index]);
    }
  }
  console.log('training process done.');
  return net;
}

function testHDRs(hdr_dir, net) {
  var dataset = makeDataset(hdr_dir, train_kernel_width, train_kernel_height, train_kernel_channel);
  for (var data_set_index in dataset.data) {
    var prediction = net.forward(dataset.data[data_set_index]);
    console.log('prediction is : ' + prediction.w[0]);
  }
}

var test_dir = '.';
var trained_net = trainHDRs(test_dir);
testHDRs(test_dir, trained_net);