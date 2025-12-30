# Test Assets

This directory contains test video files for running the examples.

## Required Test Files

The examples expect the following test files:

- `testvideo-169.avi` - Test video file (169 seconds)
- `testvideo-43.avi` - Test video file (43 seconds)
- `testvideo-5m.mpg` - Test video file (5 minutes)

## Getting Test Files

You can obtain test video files from:

1. **From the main package test assets** (if available):
   ```bash
   cp ../../fluent-ffmpeg/test/assets/testvideo-*.avi .
   cp ../../fluent-ffmpeg/test/assets/testvideo-*.mpg .
   ```

2. **Create your own test videos** using FFmpeg:
   ```bash
   # Create a test video (169 seconds)
   ffmpeg -f lavfi -i testsrc=duration=169:size=320x240:rate=1 -c:v libx264 testvideo-169.avi
   
   # Create a test video (43 seconds)
   ffmpeg -f lavfi -i testsrc=duration=43:size=320x240:rate=1 -c:v libx264 testvideo-43.avi
   
   # Create a test video (5 minutes)
   ffmpeg -f lavfi -i testsrc=duration=300:size=320x240:rate=1 -c:v libx264 testvideo-5m.mpg
   ```

3. **Download sample videos** from public test video repositories.

## Note

Test video files are typically large and should not be committed to version control. Add them to `.gitignore` if needed.

