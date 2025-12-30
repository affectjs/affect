var ffmpeg = require('@luban-ws/fluent-ffmpeg');

// make sure you set the correct path to your video file
var proc = ffmpeg(__dirname + '/assets/testvideo-169.avi')
  // use the 'podcast' preset (located in /lib/presets/podcast.js)
  .preset('podcast')
  // in case you want to override the preset's setting, just keep chaining
  .videoBitrate('512k')
  // setup event handlers
  .on('end', function() {
    console.log('file has been converted succesfully');
  })
  .on('error', function(err) {
    console.log('an error happened: ' + err.message);
  })
  // save to file
  .save(__dirname + '/output.m4v');

