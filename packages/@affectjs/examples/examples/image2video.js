var ffmpeg = require('@luban-ws/fluent-ffmpeg');

// make sure you set the correct path to your video file
var proc = ffmpeg(__dirname + '/assets/test-image.jpg')
  // loop for 5 seconds
  .loop(5)
  // using 25 fps
  .fps(25)
  // setup event handlers
  .on('end', function() {
    console.log('file has been converted succesfully');
  })
  .on('error', function(err) {
    console.log('an error happened: ' + err.message);
  })
  // save to file
  .save(__dirname + '/output.m4v');

