module.exports = require('bindings')({
  module_root: __dirname,
  bindings: 'hdrloader'
});
var convnetjs = require("convnetjs");
var fs = require('fs');

var train_iteration = 64;
var train_kernel_width = 256;
var train_kernel_height = 256;
var train_kernel_channel = 3;

var test_dir = '.';
var param_file = './Drago-Parameter-Exp-Bias-Gamma.txt';

function getParameter(hdr_name) {
  fs = require('fs');
  
  var data = fs.readFileSync(param_file, 'utf8');
  var data_in_line = data.split("\n");
  for (var line_index in data_in_line) {
    if (data_in_line[line_index].indexOf(hdr_name) > -1) {
      var params = data_in_line[line_index].split(" ");
      return { 'bias': parseFloat(params[2]), 'exposure': parseFloat(params[3]), 'gamma': parseFloat(params[4]) };
    }
  }
  
  return undefined;
}

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
      var stat = fs.statSync(filename);
      if (stat && stat.isDirectory()) {
	if (recursive)
	  results = results.concat(getHDRs(file));
      } else {
	var last_dot_index = filename.lastIndexOf('.');
	if (filename.substr(last_dot_index) == ".hdr")
	  results.push({'path': filename, 'filename': file});
      }
  })
  return results;
}

function generateNet() {
  var layer_defs = [];
  layer_defs.push({type:'input', out_sx:train_kernel_width, out_sy:train_kernel_height, out_depth:train_kernel_channel});
  layer_defs.push({type:'fc', num_neurons:64, activation:'sigmoid'});
  layer_defs.push({type:'regression', num_neurons:1});
  var net = new convnetjs.Net();
  net.makeLayers(layer_defs);
  return net;
}

function fillVol(raw_data) {
   var vol = new convnetjs.Vol(raw_data);
   return vol;
}

function makeDataset(hdr_dir) {
  var training_list = getHDRs(hdr_dir, false);
  var data = [];
  var labels = [];
  var filename = [];
  for (var hdr_file_index in training_list) {
    var hdr_file_name = training_list[hdr_file_index];
    var hdr_file_loaded = readHDR(hdr_file_name.path);
    
    var params = getParameter(hdr_file_name.filename);
    if (params == undefined)
      continue;
    
    var x = fillVol(hdr_file_loaded.data);
    var y = params.exposure;
    data.push(x);
    labels.push([y]);
    filename.push(hdr_file_name.filename);
    console.log(hdr_file_name.filename + ' loaded.');
  }
  
  // prepare the dataset
  var dataset = {};
  dataset.data = data;
  dataset.labels = labels;
  dataset.filename = filename;
  return dataset;
}

function trainHDRs(hdr_dir) {
  var net = generateNet();
  var trainer = new convnetjs.Trainer(net, {method: 'sgd', learning_rate: 0.01, l2_decay: 0.001, momentum: 0.9, batch_size: 1, l1_decay: 0.001});
  var dataset = makeDataset(hdr_dir);
  var avloss = 0.0;
  for (var iteration = 0 ; iteration < train_iteration ; iteration++) {
    console.log('training iteration : ' + iteration);
    for (var data_set_index in dataset.data) {
        var stats = trainer.train(dataset.data[data_set_index], dataset.labels[data_set_index]);
    }
  }
  console.log('training process done.');
  return net;
}

function testHDRs(hdr_dir, trained_net) {
  var dataset = makeDataset(hdr_dir);
  for (var data_set_index in dataset.data) {
    var prediction = trained_net.forward(dataset.data[data_set_index]);
    var predicted_value = prediction.w[0];
    var real_value = getParameter(dataset.filename[data_set_index]).exposure;
    var error = real_value - predicted_value;
    console.log(dataset.filename[data_set_index] + ' -> prediction is : ' + predicted_value + ', error is : ' + error);
  }
}

var trained_net = trainHDRs(test_dir);
testHDRs(test_dir, trained_net);