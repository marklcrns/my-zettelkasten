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

  ./${SCRIPT_NAME} [!] <content-pattern> <tag> <directory> [start]
  ./${SCRIPT_NAME} "lorem ipsum" 'new-tag' .
  ./${SCRIPT_NAME} ! "lorem ipsum" 'new-*' .

  !                 Only include files not matching <content-pattern>.
  content-pattern   regex pattern to match the file(s) content to be included in
                    tag deletion.
  tag               name of tag to delete.
  directory         directory to search into (recursively).

EOF
}

if [[ -n ${1+x} ]]; then
  if [[ "${1}" == "!" ]]; then
    GREP_FLAGS=-rLi
    shift 1
  else
    GREP_FLAGS=-rli
  fi
else
  usage
  exit 1
fi

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

readonly GREP_FLAGS
readonly PATTERN
readonly TAG
readonly TARGET_DIR
readonly START
readonly SCRIPT_PATH
readonly SCRIPT_DIR
readonly SCRIPT_NAME
readonly INDENT="  "

MATCH_FILES="$( \
  grep ${GREP_FLAGS} \
  --exclude-dir=".git" \
  --exclude-dir=".neuron" \
  --exclude-dir=".github" \
  --exclude-dir=".static" \
  --exclude-dir=".vscode" \
  --exclude="index.md" \
  --exclude="todo.md" \
  --exclude="faq.md" \
  --exclude="README.md" \
  -- \
  "${PATTERN}" \
  ${TARGET_DIR}/*.md \
)"

for file in $MATCH_FILES; do
  line_nr="$(awk "/tags:/{ print NR; exit }" "${file}")"

  begin_meta=0
  begin_tags=0
  while IFS='' read -r line || [ -n "${line}" ]; do
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
      continue
    elif [[ ${begin_tags} -eq 1 ]]; then

      if [[ "${line}" =~ ${INDENT}-\ ${TAG} ]]; then
        ((line_nr++))
        echo "Deleting '${TAG}' tag from ${file}..."
        sed -i "${line_nr}d" "${file}"
        break
      elif [[ "${line}" =~ ${INDENT}-* ]]; then
        ((line_nr++))
        continue
      else
        break
      fi
    else
      continue
    fi
  done < ${file}

  # Delete tags: meta if no more tags
  if [[ ${begin_tags} -eq 1 ]]; then
    line_nr="$(awk "/tags:/{ print NR; exit }" "${file}")"
    next=$(sed -n "$((line_nr+1))p" "${file}")
    if [[ -n ${line_nr} ]] && ! [[ "${next}" =~ ${INDENT}-.* ]]; then
      sed -i "${line_nr}d" "${file}"
    fi
  fi

  # Delete both --- metadata fence if no more metas
  if [[ ${begin_meta} -eq 1 ]]; then
    line_nr="$(awk "/---/{ print NR; exit }" "${file}")"
    next=$(sed -n "$((line_nr+1))p" "${file}")
    if [[ -n ${line_nr} ]] && [[ "${next}" == '---' ]]; then
      sed -i "${line_nr}d" "${file}"
      sed -i "${line_nr}d" "${file}"
    fi
  fi
done

if [[ -z ${MATCH_FILES} ]]; then
  echo "no matching file"
else
  echo "Done!"
fi
