var ffmpeg = require('@luban-ws/fluent-ffmpeg');

// make sure you set the correct path to your video file
ffmpeg.ffprobe(__dirname + '/assets/testvideo-169.avi', function(err, metadata) {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log(require('util').inspect(metadata, false, null));
});

