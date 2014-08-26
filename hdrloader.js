module.exports = require('bindings')({
  module_root: __dirname,
  bindings: 'hdrloader'
});
var convnetjs = require("convnetjs");
	
var layer_defs = [];
layer_defs.push({type:'input', out_sx:32, out_sy:32, out_depth:3});
layer_defs.push({type:'conv', sx:5, filters:8, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:2, stride:2});
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
layer_defs.push({type:'softmax', num_classes:10});

var hdr_loader = module.exports.hdrloader();
var hdr_data = hdr_loader.loadHDR('C:\\flower.hdr');

console.log(hdr_data.length);
// return;
for (counter = 0 ; counter < hdr_data.length / 4 ; ++counter)
  console.log(counter + " : " + hdr_data.readFloatLE(counter * 4));

// TODO : Proceed with deep learning.