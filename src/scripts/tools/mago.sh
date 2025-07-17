get_mago_tag() {
  if [ "$mago_tag" = "latest" ]; then
    mago_tag=$(get -s -n "" https://github.com/carthage-software/mago/releases/latest 2<&1 | grep -m 1 -Eo "tag/([0-9]+(\.[0-9]+)?(\.[0-9]+)?)" | head -n 1 | cut -d '/' -f 2)
  else
    status_code=$(get -v -n /tmp/mago.tmp "https://github.com/carthage-software/mago/releases/tag/$mago_tag")
    if [ "$status_code" = "200" ]; then
      mago_tag="$mago_tag"
    else
      mago_tag=$(get -s -n "" https://github.com/carthage-software/mago/releases/latest 2<&1 | grep -m 1 -Eo "tag/([0-9]+(\.[0-9]+)?(\.[0-9]+)?)" | head -n 1 | cut -d '/' -f 2)
    fi
  fi
}

add_mago() {
  mago_tag=$1
  get_mago_tag
  (
    platform='unknown-linux-gnu'
    [ "$(uname -s)" = "Darwin" ] && platform='apple-darwin'
    arch="$(uname -m)"
    [[ "$arch" = 'arm64' || "$arch" = 'aarch64' ]] && arch='aarch64'
    [[ "$arch" = 'x86_64' || "$arch" = 'amd64' ]] && arch='x86_64'
    get -q -n /tmp/mago.tar.gz "https://github.com/carthage-software/mago/releases/download/$mago_tag/mago-$mago_tag-$arch-$platform.tar.gz"
    sudo tar -xzf /tmp/mago.tar.gz -C /tmp/
    sudo mv /tmp/mago-$mago_tag-$arch-$platform/mago /usr/local/bin/mago
    sudo chmod +x /usr/local/bin/mago
  ) >/dev/null 2>&1
  add_log "${tick:?}" "mago" "Added mago $mago_tag"
}