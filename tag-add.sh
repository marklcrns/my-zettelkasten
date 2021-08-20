#!/usr/bin/env bash

set -o pipefail
set -o nounset

SCRIPT_PATH="$(realpath -- "${0}")"
while [ -h "${SCRIPT_PATH}" ]; do
  SCRIPT_DIR="$(cd -P "$(dirname "${SCRIPT_PATH}")" >/dev/null 2>&1 && pwd)"
  SCRIPT_PATH="$(readlink "${SCRIPT_PATH}")"
  [[ "${SCRIPT_PATH}" != /* ]] && SCRIPT_PATH="${SCRIPT_DIR}/${SCRIPT_PATH}"
done
SCRIPT_DIR="$(cd -P "$(dirname "${SCRIPT_PATH}")" >/dev/null 2>&1 && pwd)"
SCRIPT_NAME="$(basename -- "${SCRIPT_PATH}")"

usage() {
cat << EOF
USAGE: <required> [optional]

  ./${SCRIPT_NAME} <content-pattern> <tag> <directory> [start]

  content-pattern   regex pattern to match the file(s) content to be included in
                    tag appending.
  tag               name of tag to append.
  directory         directory to search into (recursively).
  start             0 to append to start of tags meta list, 1 to append at the
                    end of the list, or a tag to append next to.

EOF
}

if [[ -n ${1+x} ]]; then
  PATTERN="${1}"
else
  usage
  exit 1
fi

if [[ -n ${2+x} ]]; then
  TAG="${2}"
else
  usage
  exit 1
fi

if [[ -n ${3+x} ]]; then
  TARGET_DIR="${3}"
else
  usage
  exit 1
fi

START="${4:-0}"

readonly PATTERN
readonly TAG
readonly TARGET_DIR
readonly START
readonly SCRIPT_PATH
readonly SCRIPT_DIR
readonly SCRIPT_NAME
readonly INDENT="  "

MATCH_FILES="$( \
  grep -rli \
  --exclude-dir=.git \
  --exclude-dir=.neuron \
  --exclude-dir=.github \
  --exclude-dir=.static \
  --exclude-dir=.vscode \
  --include \*.md \
  -- \
  "${PATTERN}" \
  ${TARGET_DIR} \
)"

for file in $MATCH_FILES; do
  begin_meta=0
  begin_tags=0
  line_nr=0

  # Append at the end of tags
  while IFS='' read -r line || [ -n "${line}" ]; do
    ((line_nr++))
    # Bound search only within metadata space
    if [[ "${line}" == "---" ]]; then
      if [[ ${begin_meta} -eq 0 ]]; then
        begin_meta=1
        continue
      else
        break
      fi
    fi

    # Bound search only under tags meta
    if [[ "${line}" =~ tags:* ]] && [[ ${begin_tags} -eq 0 ]]; then
      begin_tags=1
      if [[ ${START} == '1' ]]; then
        ((line_nr++))
        break
      fi
      continue
    elif [[ ${begin_tags} -eq 1 ]]; then
      if [[ "${line}" == "${INDENT}- ${START}" ]]; then
        ((line_nr++))
        break
      elif [[ "${line}" =~ ${INDENT}-.* ]]; then
        continue
      else
        break
      fi
    else
      continue
    fi
  done < ${file}

  # Additionally append two --- if not existing at beginning of the file
  if [[ ${begin_meta} -eq 0 ]]; then
    awk "NR==1{print \"---\n---\"}1" "${file}" > tmp && mv tmp "${file}"
    line_nr=2
  fi
  # Additionally append tags meta if not exists
  if [[ ${begin_tags} -eq 0 ]]; then
    awk "NR==${line_nr}{print \"tags:\"}1" "${file}" > tmp && mv tmp "${file}"
    ((line_nr++))
  fi

  echo "Appending '${TAG}' tag into ${file}..."
  awk "NR==${line_nr}{print \"${INDENT}- ${TAG}\"}1" "${file}" > tmp && mv tmp "${file}"
done

if [[ -z ${MATCH_FILES} ]]; then
  echo "no matching file"
else
  echo "Done!"
fi
