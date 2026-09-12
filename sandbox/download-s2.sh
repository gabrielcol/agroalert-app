#!/usr/bin/env bash
# Download a Sentinel-2 product from the Copernicus Data Space Ecosystem (CDSE) eodata bucket.
# Usage: ./download-s2.sh [s3://eodata/.../PRODUCT.SAFE/] [dest-dir]
# Requires an AWS CLI profile named "cdse" holding CDSE S3 keys
# (generate at https://eodata-s3keysmanager.dataspace.copernicus.eu/).
set -euo pipefail

SRC="${1:-s3://eodata/Sentinel-2/MSI/L1C/2025/12/10/S2A_MSIL1C_20251210T101431_N0511_R022_T33TUK_20251210T105542.SAFE/}"
DEST="${2:-./data/$(basename "$SRC")}"
PROFILE="${AWS_PROFILE_CDSE:-cdse}"
ENDPOINT="https://eodata.dataspace.copernicus.eu"

mkdir -p "$DEST"
echo "Listing $SRC"
aws --profile "$PROFILE" --region default --endpoint-url "$ENDPOINT" s3 ls --recursive --human-readable --summarize "$SRC" | tail -3
echo "Syncing to $DEST"
aws --profile "$PROFILE" --region default --endpoint-url "$ENDPOINT" s3 sync "$SRC" "$DEST"
echo "Done: $(find "$DEST" -type f | wc -l | tr -d ' ') files in $DEST"
