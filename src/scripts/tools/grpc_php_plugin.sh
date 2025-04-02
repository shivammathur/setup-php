add_bazel() {
  if ! command -v bazel; then
    if [ "$(uname -s)" = "Linux" ]; then
      add_list bazel/apt https://storage.googleapis.com/bazel-apt https://bazel.build/bazel-release.pub.gpg stable jdk1.8
      install_packages bazel
    else
      brew install bazel
    fi
  fi
}

get_grpc_tag() {
  if [ "$grpc_tag" = "latest" ]; then
    grpc_tag=$(get -s -n "" https://github.com/grpc/grpc/releases/latest | grep -Eo -m 1 "v[0-9]+\.[0-9]+\.[0-9]+" | head -n 1)
  else
    if [[ ${grpc_tag:0:1} != "v" ]] ; then grpc_tag="v$grpc_tag"; fi
    status_code=$(get -v -n /tmp/grpc.tmp "https://github.com/grpc/grpc/releases/tag/$grpc_tag")
    if [ "$status_code" != "200" ]; then
      grpc_tag=$(get -s -n "" https://github.com/grpc/grpc/releases/latest | grep -Eo -m 1 "v[0-9]+\.[0-9]+\.[0-9]+" | head -n 1)
    fi
  fi
}

add_grpc_php_plugin_brew() {
  . "${0%/*}"/tools/brew.sh
  configure_brew
  [ -e /usr/local/bin/protoc ] && sudo mv /usr/local/bin/protoc /tmp/protoc && sudo mv /usr/local/include/google /tmp
  brew install grpc
  brew link --force --overwrite grpc 
  [ -e /tmp/protoc ] && sudo mv /tmp/protoc /usr/local/bin/protoc && sudo mv /tmp/google /usr/local/include/
  grpc_tag="v$(brew info grpc | grep "grpc:" | grep -Eo "[0-9]+\.[0-9]+\.[0-9]+")"
  license_path="$(brew --prefix grpc)/LICENSE"
}

add_grpc_php_plugin_compile() {
  get_grpc_tag
  get -s -n "" "https://github.com/grpc/grpc/archive/$grpc_tag.tar.gz" | tar -xz -C /tmp
  export DISABLE_BAZEL_WRAPPER=1
  (
    cd "/tmp/grpc-${grpc_tag:1}" || exit
    add_bazel
    ./tools/bazel build src/compiler:grpc_php_plugin
    sudo mv ./bazel-bin/src/compiler/grpc_php_plugin /usr/local/bin/grpc_php_plugin
    sudo chmod a+x /usr/local/bin/grpc_php_plugin
    license_path="/tmp/grpc-${grpc_tag:1}/LICENSE"
  )
}

add_grpc_php_plugin() {
  grpc_tag=$1
  license_path=""
  if [ "$grpc_tag" = "latest" ]; then
    add_grpc_php_plugin_brew 
  else
    add_grpc_php_plugin_compile 
  fi
  set_output grpc_php_plugin_path "$(command -v grpc_php_plugin)"
  add_log "${tick:?}" "grpc_php_plugin" "Added grpc_php_plugin ${grpc_tag:1}"
  printf "$GROUP\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "grpc_php_plugin" "Click to read the grpc_php_plugin related license information"
  cat "$license_path"
  echo "$END_GROUP"
}
