module.exports = require('bindings')({
  module_root: __dirname,
  bindings: 'hdrloader'
});
var convnetjs = require("convnetjs");

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
  return [hdr_width, hdr_height, hdr_buff];
}
	
var layer_defs = [];
layer_defs.push({type:'input', out_sx:train_kernel_width, out_sy:train_kernel_height, out_depth:train_kernel_channel});
layer_defs.push({type:'conv', sx:5, filters:8, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:2, stride:2});
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
layer_defs.push({type:'softmax', num_classes:10});
var net = new convnetjs.Net();
net.makeLayers(layer_defs);

var myHDR = readHDR('flower.hdr');
console.log(myHDR);

// TODO : Proceed with deep learning.