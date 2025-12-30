# Test Assets

This directory contains test assets for runtime tests.

## Files

- `sample-image.jpg` - Test image (1920x1080) downloaded from picsum.photos
- `sample-video.mp4` - Test video (to be added)

## Downloading Test Video

To download a test video, you can use:

```bash
# Option 1: Use a small test video from sample-videos.com
curl -L -o sample-video.mp4 "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"

# Option 2: Use Google Cloud Storage sample
curl -L -o sample-video.mp4 "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

# Option 3: Create a simple test video using ffmpeg (if available)
ffmpeg -f lavfi -i testsrc=duration=5:size=640x480:rate=30 -pix_fmt yuv420p sample-video.mp4
```

## Output Directory

The `output/` directory is used for test outputs and is automatically cleaned up after tests.

