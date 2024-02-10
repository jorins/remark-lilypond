#!/usr/bin/env sh
# Utility to build test files 

cd $(realpath $(dirname $0))

rm -f score.*

echo '\version "2.24"

\score {
  {
    d4 e f g
  }
  \layout { }
  \midi { }
}' > score.ly

/usr/bin/env lilypond \
  --format=pdf \
  --format=png \
  --define-default=crop \
  --define-default=no-point-and-click \
  score.ly

/usr/bin/env lilypond \
  --format=svg \
  --define-default=crop \
  --define-default=no-point-and-click \
  score.ly
