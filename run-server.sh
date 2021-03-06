#!/bin/bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/video-speech-recognition/credentials/gcp/service-account.json"
export FFMPEG_PATH="/path/to/video-speech-recognition/bin/ffmpeg"

rm ./bin/vsr_x64

cd src/server
go build -o ../../bin/vsr_x64
../../bin/vsr_x64