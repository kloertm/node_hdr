module.exports = require('bindings')({
  module_root: __dirname,
  bindings: 'hdrloader'
});
var convnetjs = require("convnetjs");
var fs = require('fs');

var train_kernel_width = 256;
var train_kernel_height = 256;
var train_kernel_channel = 3;

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
  layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:kernel_width*kernel_height*kernel_channel});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'regression', num_neurons:1});
  var net = new convnetjs.Net();
  net.makeLayers(layer_defs);
  return net;
}

function makeDataset(hdr_dir, kernel_width, kernel_height, kernel_channel) {
  var training_list = getHDRs(hdr_dir, false);
  var data = [];
  var labels = [];
  for (var hdr_file_index in training_list) {
    var hdr_file_name = training_list[hdr_file_index];
    var hdr_file_loaded = readHDR(hdr_file_name);
    var x = new convnetjs.Vol(1, 1, kernel_width*kernel_height*kernel_channel, 0.0);
    x.w = hdr_file_loaded.data;
    var y = parseFloat(1.0) + hdr_file_index; // TODO : fix me
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
  var trainer = new convnetjs.SGDTrainer(net, {learning_rate:0.01, momentum:0.9, batch_size:5, l2_decay:0.0});
  var dataset = makeDataset(hdr_dir, train_kernel_width, train_kernel_height, train_kernel_channel);
  for (var data_set_index in dataset.data) {
    trainer.train(dataset.data[data_set_index], dataset.labels[data_set_index]);
  }
  console.log('training process done.');
  return net;
}

trainHDRs('/home/user/Desktop/node_hdr');