var fs = require('fs'),
  ffmpeg = require('@luban-ws/fluent-ffmpeg');

// open input stream
var infs = fs.createReadStream(__dirname + '/assets/testvideo-43.avi');

infs.on('error', function(err) {
  console.log(err);
});

var proc = ffmpeg(infs)
  .preset('flashvideo')
  // setup event handlers
  .on('progress', function(info) {
    console.log('progress ' + info.percent + '%');
  })
  .on('end', function() {
    console.log('done processing input stream');
  })
  .on('error', function(err) {
    console.log('an error happened: ' + err.message);
  })
  .save(__dirname + '/output.flv');

