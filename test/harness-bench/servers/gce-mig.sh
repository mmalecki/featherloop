#!/usr/bin/env bash
# Prints the bench's model servers in a regional GCP managed instance group: a base
# URL, http://<external IP>:<port>/v1, for each of its RUNNING instances. For the
# bench's --servers-cmd, which runs it again every --servers-every seconds; spot VMs
# come back with new IPs, which the next run picks up.
#
#   test/harness-bench/servers/gce-mig.sh <mig> <region> [port=9931]
#
# Needs gcloud, signed in to an account that can list instances (roles/compute.viewer
# is enough), and the project set (gcloud config, or CLOUDSDK_CORE_PROJECT). Exits
# non-zero if gcloud fails, so the bench keeps the servers it has.
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "usage: $0 <mig> <region> [port=9931]" >&2
  exit 2
fi
mig=$1 region=$2 port=${3:-9931}
# Names and regions are lowercase letters, digits and dashes: safe in a regex.
for arg in "$mig" "$region"; do
  [[ $arg =~ ^[a-z0-9-]+$ ]] || { echo "$0: bad name: $arg" >&2; exit 2; }
done
[[ $port =~ ^[0-9]+$ ]] || { echo "$0: bad port: $port" >&2; exit 2; }

# A MIG's instances carry a created-by metadata item naming it:
# projects/<number>/regions/<region>/instanceGroupManagers/<mig>.
gcloud compute instances list \
  --filter="status=RUNNING AND metadata.items.created-by~\"/regions/${region}/instanceGroupManagers/${mig}\$\"" \
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)" |
  while read -r ip; do
    # An instance without an external IP has nothing to offer the bench.
    if [[ -n $ip ]]; then echo "http://${ip}:${port}/v1"; fi
  done
