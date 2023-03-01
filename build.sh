#!/bin/bash

set -euo pipefail

content="<!-- README.md -->\n$(pandoc -f gfm -t html README.md)\n<!-- end README.md -->"
awk -i inplace -v content="$content" '/<!-- README.md -->/,/<!-- end README.md -->/ { if ( $0 ~ /<!-- end README.md -->/ ) print content; next } 1' index.html

#awk -i inplace -v r="${content}" '{gsub(/<!-- README.md -->/,/<!-- end README.md -->/,r)}1' index.html
