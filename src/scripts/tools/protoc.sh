get_protobuf_tag() {
  if [ "$protobuf_tag" = "latest" ]; then
    protobuf_tag=$(get -s -n "" https://github.com/protocolbuffers/protobuf/releases/latest 2<&1 | grep -m 1 -Eo "(v[0-9]+\.[0-9]+\.[0-9]+)" | head -n 1)
  else
    status_code=$(get -v -n /tmp/protobuf.tmp "https://github.com/protocolbuffers/protobuf/releases/tag/v$protobuf_tag")
    if [ "$status_code" = "200" ]; then
      protobuf_tag="v$protobuf_tag"
    else
      protobuf_tag=$(get -s -n "" https://github.com/protocolbuffers/protobuf/releases/latest 2<&1 | grep -m 1 -Eo "(v[0-9]+\.[0-9]+\.[0-9]+)" | head -n 1)
    fi
  fi
}

add_protoc() {
  protobuf_tag=$1
  get_protobuf_tag
  (
    platform='linux'
    [ "$(uname -s)" = "Darwin" ] && platform='osx'
    get -q -n /tmp/protobuf.zip "https://github.com/protocolbuffers/protobuf/releases/download/$protobuf_tag/protoc-${protobuf_tag:1}-$platform-x86_64.zip"
    sudo unzip /tmp/protobuf.zip -d /usr/local/
    sudo chmod 777 /usr/local/bin/protoc -R /usr/local/include/google
  ) >/dev/null 2>&1
  add_log "${tick:?}" "protoc" "Added protoc ${protobuf_tag:1}"
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "protoc" "Click to read the protoc related license information"
  curl "${curl_opts[@]:?}" https://raw.githubusercontent.com/protocolbuffers/protobuf/master/LICENSE
  echo "::endgroup::"
}
