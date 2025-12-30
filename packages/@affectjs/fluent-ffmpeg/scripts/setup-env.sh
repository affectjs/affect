#!/bin/sh
# Setup environment variables for FFmpeg from CLI output
# This script is sourced (.) to set environment variables in the current shell
if [ -z "$FFMPEG_PATH" ]; then
  OUTPUT=$(pnpm exec fluent-ffmpeg-cli setup --json 2>/dev/null)
  FFMPEG=$(echo "$OUTPUT" | node -p "try { const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); d.config.ffmpeg || '' } catch(e) { '' }")
  FFPROBE=$(echo "$OUTPUT" | node -p "try { const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); d.config.ffprobe || '' } catch(e) { '' }")
  if [ -n "$FFMPEG" ]; then
    export FFMPEG_PATH="$FFMPEG"
  fi
  if [ -n "$FFPROBE" ]; then
    export FFPROBE_PATH="$FFPROBE"
  fi
fi

