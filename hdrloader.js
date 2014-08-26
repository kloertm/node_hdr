module.exports = require('bindings')({
  module_root: __dirname,
  bindings: 'hdrloader'
});
var convnetjs = require("convnetjs");

function readHDR(hdr_path) {
  var hdr_loader = module.exports.hdrloader();
  var hdr_data = hdr_loader.loadHDR(hdr_path);
  var hdr_width = hdr_data.readInt32LE(0);
  var hdr_height = hdr_data.readInt32LE(4);
  var hdr_buff = [];
  
  console.log(hdr_width);
  console.log(hdr_height);
  
  for (i = 0 ; i < hdr_width * hdr_height ; ++i) {
    hdr_buff.push(hdr_data.readFloatLE(8 + 4 * i));
  }
  return [hdr_width, hdr_height, hdr_buff];
}
	
var layer_defs = [];
layer_defs.push({type:'input', out_sx:32, out_sy:32, out_depth:3});
layer_defs.push({type:'conv', sx:5, filters:8, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:2, stride:2});
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
layer_defs.push({type:'softmax', num_classes:10});

var myHDR = readHDR('flower.hdr');
console.log(myHDR);

// TODO : Proceed with deep learning.