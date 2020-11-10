add_bazel() {
  if [ ! "$(command -v bazel)" ]; then
    os=$(uname -s)
    if [ "$os" = "Linux" ]; then
      ${apt_install:?} curl gnupg
      get -s -n "" https://bazel.build/bazel-release.pub.gpg | sudo apt-key add -
      echo "deb [arch=amd64] https://storage.googleapis.com/bazel-apt stable jdk1.8" | sudo tee /etc/apt/sources.list.d/bazel.list
      sudo "${debconf_fix:?}" apt-get update -y
      ${apt_install:?} bazel
    elif [ "$os" = "Darwin" ]; then
      brew install bazel
    fi
  fi
}

get_grpc_tag() {
  if [ "$grpc_tag" = "latest" ]; then
    grpc_tag=$(get -s -n "" https://grpc.io/release)
  else
    status_code=$(get -v -n /tmp/grpc.tmp "https://github.com/grpc/grpc/releases/tag/v$grpc_tag")
    if [ "$status_code" = "200" ]; then
      grpc_tag="v$grpc_tag"
    else
      grpc_tag=$(get -s -n "" https://grpc.io/release)
    fi
  fi
}

add_grpc_php_plugin() {
  grpc_tag=$1
  get_grpc_tag
  (
    get -s -n "" "https://github.com/grpc/grpc/archive/$grpc_tag.tar.gz" | tar -xz -C /tmp
    cd "/tmp/grpc-${grpc_tag:1}" || exit
    add_bazel
    echo "os: $os"
    echo "release: $DISTRIB_RELEASE"
    if [ "$DISTRIB_RELEASE" = "16.04" ]; then
      CC="$(command -v gcc)" CXX="$(command -v g++)" ./tools/bazel build src/compiler:grpc_php_plugin
    else
      ./tools/bazel build src/compiler:grpc_php_plugin
    fi
    sudo mv ./bazel-bin/src/compiler/grpc_php_plugin /usr/local/bin/grpc_php_plugin
    sudo chmod a+x /usr/local/bin/grpc_php_plugin
  ) >/dev/null 2>&1
  echo "::set-output name=grpc_php_plugin_path::/usr/local/bin/grpc_php_plugin"
  add_log "${tick:?}" "grpc_php_plugin" "Added grpc_php_plugin ${grpc_tag:1}"
  printf "::group::\033[34;1m%s \033[0m\033[90;1m%s \033[0m\n" "grpc_php_plugin" "Click to read the grpc_php_plugin related license information"
  cat "/tmp/grpc-${grpc_tag:1}/LICENSE"
  echo "::endgroup::"
}
