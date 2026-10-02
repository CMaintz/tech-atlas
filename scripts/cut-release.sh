#!/usr/bin/env bash
# cut-release.sh: cut an Atlas release in one command (same idea as Foundry's).
#
#   Usage:  bash scripts/cut-release.sh <beta|major|minor|patch|X.Y.Z[-beta.N]> [--since <ref>] [--dry-run]
#
# From a clean main that is in sync with origin, it:
#   1. computes the new version from the latest vX.Y.Z[-beta.N] tag,
#   2. prepends a CHANGELOG section built from the conventional commits since that tag
#      (or since --since <ref>),
#   3. bumps app/package.json + its lock file (the footer and About dialog read it),
#   4. commits, tags vX.Y.Z[-beta.N], pushes both and creates the GitHub release
#      (marked as a pre-release for betas). The push to main deploys the site.
set -euo pipefail

usage() { echo "usage: cut-release.sh <beta|major|minor|patch|X.Y.Z[-beta.N]> [--since <ref>] [--dry-run]" >&2; exit 1; }

BUMP="" SINCE="" DRY_RUN=false
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --since) SINCE="${2:?--since needs a ref}"; shift ;;
    -*) usage ;;
    *) [ -z "$BUMP" ] || usage; BUMP="$1" ;;
  esac
  shift
done

die()  { echo "cut-release: $*" >&2; exit 1; }
step() { echo "== $* =="; }
run()  { if $DRY_RUN; then echo "  [dry-run] $*"; else eval "$*"; fi; }

require_clean_main() {
  [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || die "not on main (checkout main first)"
  if ! git diff --quiet || ! git diff --cached --quiet; then die "working tree not clean"; fi
  git fetch -q --tags origin main
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "main is not in sync with origin/main"
}

current_version() { git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' | sed 's/^v//'; }

resolve_version() { # <current> <bump-arg>
  local cur="$1" base="${1%%-*}" maj min pat
  IFS=. read -r maj min pat <<< "$base"
  case "$2" in
    beta)
      [[ "$cur" == *-beta.* ]] || die "$cur is not a beta; start one explicitly, e.g. $((maj+1)).0.0-beta.1"
      echo "$base-beta.$(( ${cur##*-beta.} + 1 ))" ;;
    major|minor|patch)
      [ "$cur" = "$base" ] || die "$cur is a beta; use 'beta', or the final version (e.g. $base) to launch"
      case "$2" in
        major) echo "$((maj+1)).0.0" ;;
        minor) echo "$maj.$((min+1)).0" ;;
        patch) echo "$maj.$min.$((pat+1))" ;;
      esac ;;
    [0-9]*.[0-9]*.[0-9]*) echo "$2" ;;
    *) die "bump must be beta | major | minor | patch | X.Y.Z[-beta.N]" ;;
  esac
}

has_breaking() { # <from>
  git log "$1"..HEAD --no-merges --format='%s%n%b' | grep -qE '^[a-z]+([(].+[)])?!:|BREAKING CHANGE'
}

group() { # <from> <subject-regex> <title>
  local body
  body=$(git log "$1"..HEAD --no-merges --format='%h%x09%s' \
    | awk -F'\t' -v re="$2" '$2 ~ re { sub(/^[a-z]+([(].+[)])?!?: */, "", $2); print "* " $2 " (" $1 ")" }')
  [ -n "$body" ] && printf '\n### %s\n\n%s\n' "$3" "$body"
  return 0
}

build_changelog_section() { # <from> <last-tag> <newver> <repo>
  local from="$1" last="$2" ver="$3" repo="$4"
  printf '## [v%s](https://github.com/%s/compare/%s...v%s) (%s)\n' "$ver" "$repo" "$last" "$ver" "$(date +%Y-%m-%d)"
  local entry
  group "$from" '^[a-z]+([(].+[)])?!:' 'BREAKING CHANGES'
  for entry in feat:Features fix:Fixes content:Content perf:Performance revert:Reverts docs:Documentation; do
    group "$from" "^${entry%%:*}([(].+[)])?!?:" "${entry#*:}"
  done
  echo
}

# Insert the new section directly above the first "## " entry.
insert_changelog() { # <section-file>
  awk -v f="$1" '
    !done && /^## / { while ((getline l < f) > 0) print l; done=1 }
    { print }
    END { if (!done) { while ((getline l < f) > 0) print l } }
  ' CHANGELOG.md > CHANGELOG.md.new && mv CHANGELOG.md.new CHANGELOG.md
}

main() {
  [ -n "$BUMP" ] || usage
  require_clean_main
  local repo cur ver last tag from section prerelease=""
  repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  cur=$(current_version)
  ver=$(resolve_version "$cur" "$BUMP")
  last="v$cur" ; tag="v$ver" ; from="${SINCE:-$last}"
  git rev-parse -q --verify "refs/tags/$tag" > /dev/null && die "$tag already exists"
  [[ "$ver" == *-* ]] && prerelease="--prerelease"
  step "release $cur -> $ver (changelog from $from)"

  # Outside betas, a breaking change since the last tag demands a major bump.
  if [ "$cur" = "${cur%%-*}" ] && has_breaking "$from" && [ "${ver%%.*}" = "${cur%%.*}" ]; then
    die "breaking commits since $from but $ver is not a major bump; use 'major' or an explicit version"
  fi

  section=$(mktemp)
  build_changelog_section "$from" "$last" "$ver" "$repo" > "$section"
  echo "--- CHANGELOG section ---"; sed 's/^/  /' "$section"

  run "(cd app && npm version '$ver' --no-git-tag-version --allow-same-version > /dev/null)"
  run "insert_changelog '$section'"
  run "git add CHANGELOG.md app/package.json app/package-lock.json"
  run "git commit -q -m 'chore(release): $tag'"
  run "git tag '$tag'"
  run "git push origin main '$tag'"
  run "gh release create '$tag' --title '$tag' --notes-file '$section' $prerelease"
  echo "Done: $tag released."
}

# Only run when executed, not when sourced (so the helpers are testable).
if [ "${BASH_SOURCE[0]:-$0}" = "$0" ]; then main; fi
