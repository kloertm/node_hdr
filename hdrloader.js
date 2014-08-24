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

var hdr = module.exports.hdrloader();
console.log(hdr.loadHDR('C:\\flower.hdr'));

// TODO : Proceed with deep learning.