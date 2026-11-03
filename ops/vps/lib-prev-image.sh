#!/usr/bin/env bash
# Sourced by deploy-web.sh (and its test). Picks the rollback image BEFORE the
# new web image is built, and never fails the deploy just because the running
# image lost its tag/ID.
#
# Why: bahasacerdas/web:local is a shared tag on the VPS. Any other
# `docker compose build web` (e.g. a staging/prebuild run from another
# worktree) re-points it; with the containerd image store the old,
# now-untagged image of the RUNNING container can disappear, and
# `docker tag <id>` then fails (deploy 3 Nov 2026, image 52b1f6f3b829).
#
# Order of preference (sets PREV_REF = image ref to roll back to, or ""):
#   1. running container's image ID still exists  -> docker tag  -> prev-<stamp>
#   2. ID gone, container running                  -> docker commit (no pause)
#                                                     -> prev-<stamp>, WARNING
#   3. container not running / commit failed       -> newest existing prev-* tag,
#                                                     WARNING
#   4. nothing                                     -> PREV_REF="" (rollback
#                                                     unavailable, deploy goes on)
# Nothing here deletes or untags any image.

# newest_prev_tag IMAGE -> prints "IMAGE:prev-..." (lexically newest stamp) or nothing
newest_prev_tag() {
  local image="$1" tag
  tag="$(docker image ls "$image" --format '{{.Tag}}' 2>/dev/null | grep -E '^prev-[0-9]{8}T[0-9]{6}Z' | sort | tail -1 || true)"
  [[ -n "$tag" ]] && printf '%s:%s\n' "$image" "$tag"
  return 0
}

# keep_previous_image CONTAINER IMAGE STAMP  -> sets global PREV_REF
keep_previous_image() {
  local container="$1" image="$2" stamp="$3" running_id running fallback
  PREV_REF=""
  running_id="$(docker inspect -f '{{.Image}}' "$container" 2>/dev/null || true)"
  running="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || true)"

  if [[ -n "$running_id" ]] && docker image inspect "$running_id" >/dev/null 2>&1; then
    if docker tag "$running_id" "$image:prev-$stamp"; then
      PREV_REF="$image:prev-$stamp"
      echo "previous image: $PREV_REF"
      return 0
    fi
    echo "WARNING: docker tag of running image $running_id failed; trying other rollback sources" >&2
  elif [[ -n "$running_id" ]]; then
    echo "WARNING: running web image $running_id no longer exists in the image store (tag re-pointed by another build?)" >&2
  fi

  if [[ "$running" == true ]]; then
    # --pause=false: never freeze production traffic. Local tag only (it carries
    # the container's runtime env), never pushed anywhere.
    if docker commit --pause=false \
         -m "rollback snapshot of running $container (image ${running_id:-unknown} missing)" \
         "$container" "$image:prev-$stamp" >/dev/null; then
      PREV_REF="$image:prev-$stamp"
      echo "WARNING: saved rollback image by committing the running container: $PREV_REF" >&2
      return 0
    fi
    echo "WARNING: docker commit of $container failed" >&2
  fi

  fallback="$(newest_prev_tag "$image")"
  if [[ -n "$fallback" ]]; then
    PREV_REF="$fallback"
    echo "WARNING: running web image unavailable; rollback falls back to the newest older tag $PREV_REF (may be older than the code now live)" >&2
  else
    echo "WARNING: no running web image and no prev-* tag; rollback unavailable for this deploy" >&2
  fi
  return 0
}
