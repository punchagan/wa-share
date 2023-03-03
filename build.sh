#!/bin/bash

set -euo pipefail

content="<!-- README.md -->\n$(pandoc -f gfm -t html README.md)\n<!-- end README.md -->"
awk -i inplace -v content="$content" '/<!-- README.md -->/,/<!-- end README.md -->/ { if ( $0 ~ /<!-- end README.md -->/ ) print content; next } 1' index.html

embed='    <iframe width="300" height="800" src="https://www.youtube-nocookie.com/embed/tAKMq4soaJE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>'
awk -i inplace -v content="$embed" '/<!-- image link -->/,/<!-- end image link -->/ { if ( $0 ~ /<!-- end image link -->/ ) print content; next } 1' index.html
