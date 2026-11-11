#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

case ${1:-} in
  start)
    exec docker compose --env-file "$script_dir/compose.env" -f "$script_dir/compose.yaml" up -d --build
    ;;
  stop)
    exec docker compose --env-file "$script_dir/compose.env" -f "$script_dir/compose.yaml" down
    ;;
  reload)
    printf 'Restarting ssh-mcp to reload config.toml; existing SSH/MCP sessions will disconnect.\n' >&2
    exec docker compose --env-file "$script_dir/compose.env" -f "$script_dir/compose.yaml" restart ssh-mcp
    ;;
  *)
    printf 'Usage: %s {start|stop|reload}\n' "$0" >&2
    exit 2
    ;;
esac
