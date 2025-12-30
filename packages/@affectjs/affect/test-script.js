// Test script for fluent-ffmpeg-cli run command
// Use CommonJS require since fluent-ffmpeg is CommonJS
const { createRequire } = require('module');
const requireLocal = createRequire(import.meta.url);
const ffmpeg = requireLocal('@luban-ws/fluent-ffmpeg');

console.log('Testing fluent-ffmpeg with environment variables:');
console.log('FFMPEG_PATH:', process.env.FFMPEG_PATH);
console.log('FFPROBE_PATH:', process.env.FFPROBE_PATH);

// Test if we can create a command
const command = ffmpeg();
console.log('✓ fluent-ffmpeg command created successfully');

// Test if we can get ffmpeg path
command._getFfmpegPath((err, path) => {
    if (err) {
        console.error('✗ Error getting ffmpeg path:', err.message);
        process.exit(1);
    } else {
        console.log('✓ FFmpeg path:', path);
        process.exit(0);
    }
});

