#!/usr/bin/env bash
# Put the trailer's own audio under a rendered video, cut to the same frames.
#
#   tools/mux.sh 1 332 674 out/t1-phase0/video.mp4 out/odyssey-trailer-1-phase0.mp4
#
# Frame n of Trailer 1 starts at sample 2000 n (48 kHz, 24 fps); of Trailer 2 at
# 2002 n (24000/1001 fps). The Opus track is decoded, cut on those samples, encoded
# as AAC, and muxed with the video copied as it is. Then the result is decoded again
# and compared with the source cut, so the offset is measured, not assumed.
set -euo pipefail

if [[ $# -ne 5 ]]; then
  echo "usage: tools/mux.sh <film> <from-frame> <to-frame> <video.mp4> <out.mp4>" >&2
  exit 2
fi
film=$1 from=$2 to=$3 video=$4 out=$5
here=$(cd "$(dirname "$0")" && pwd)
src="$here/../ref/t${film}.webm"
case "$film" in
  1) spf=2000 ;;
  2) spf=2002 ;;
  *) echo "film is 1 or 2" >&2; exit 2 ;;
esac
start=$((from * spf))
end=$((to * spf))
work=$(mktemp -d "${TMPDIR:-/tmp}/mux.XXXXXX")
trap 'rm -rf "$work"' EXIT

ffmpeg -v error -y -i "$src" -vn -af "atrim=start_sample=${start}:end_sample=${end},asetpts=PTS-STARTPTS" \
  -ar 48000 -c:a pcm_s24le "$work/cut.wav"
ffmpeg -v error -y -i "$video" -i "$work/cut.wav" -map 0:v:0 -map 1:a:0 -c:v copy \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$out"
python3 "$here/audiocheck.py" "$work/cut.wav" "$out" "$video"
