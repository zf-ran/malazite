#!/bin/bash

set -e

TMP_DIR="$(mktemp -d /dev/shm/malazite.XXXXXX)"
OUT="$TMP_DIR/release"
ARCHIVE="release.tar.gz"

trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$OUT"
mkdir -p "$OUT/problems"

cp -r dist "$OUT"

mkdir -p "$OUT/data"
sqlite3 "$OUT/data/data.db" < initialize-database.sql

cp -r judge "$OUT"

mkdir -p "$OUT/public"
cp -r public/index.html public/favicon.ico public/vendor public/dist "$OUT/public"

cp config.yaml "$OUT"

tar -czf "$ARCHIVE" -C "$TMP_DIR" release

rm -rf "$OUT"
