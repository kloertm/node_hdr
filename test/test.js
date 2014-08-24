const
    hdrloader = require('../index.js').hdrloader;
    should = require('should');

describe('hdrloader', function() {
  var hdr;

  it('#hdrloader() should be a function', function() {
    hdrloader.should.be.a.Function;
  });

  it('#hdr.toString() should return hdrloader namespace', function() {
    hdr = hdrloader();
    hdr.toString().should.equal('hdrloader namespace');
  })

});