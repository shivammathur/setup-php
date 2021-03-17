# Function to parse extension environment variables
parse_args() {
  extension=$1
  suffix=$2
  up_extension=$(echo "$extension" | tr '[:lower:]' '[:upper:]')
  var="${extension}_${suffix}"
  up_var="${up_extension}_${suffix}"
  output=$(echo "${!var} ${!up_var}" | sed "s/, */ /g")
  echo "$output" | xargs -n 1 | sort | uniq | xargs
}

# Function to log if a library is installed
add_lib_log() {
  lib=$1
  output=$2
  if [ "x$output" != "x" ]; then
    add_log "${tick:?}" "$lib" "Installed"
  else
    add_log "${cross:?}" "$lib" "Could not install $lib"
  fi
}

# Function to add required libraries
add_libs() {
  libs=("$@")
  for lib in "${libs[@]}"; do
    if [ "$(uname -s)" = "Linux" ]; then
      install_packages "$lib" >/dev/null 2>&1
      add_lib_log "$lib" "$(dpkg -s "$lib" 2>/dev/null | grep Status)"
    else
      brew install "$lib" >/dev/null 2>&1
      add_lib_log "$lib" "$(find "${brew_cellar:?}" -maxdepth 1 -name "$lib")"
    fi
  done
}

# Function to run command in a group
run_group() {
  command=$1
  log=$2
  echo "$command" | sudo tee ./run_group.sh >/dev/null 2>&1
  echo "::group::$log"
  . ./run_group.sh
  rm ./run_group.sh
  echo "::endgroup::"
}

# Function to install extension from a git repository
add_extension_from_source() {
  extension=$1
  domain=$2
  org=$3
  repo=$4
  sub_dir=$5
  release=$6
  prefix=$7
  slug="$extension-$release"
  libraries="$(parse_args "$extension" LIBS)"
  opts="$(parse_args "$extension" CONFIGURE_OPTS)"
  prefix_opts="$(parse_args "$extension" CONFIGURE_PREFIX_OPTS)"
  suffix_opts="$(parse_args "$extension" CONFIGURE_SUFFIX_OPTS)"
  step_log "Setup $slug"
  (
    add_devtools phpize >/dev/null
    delete_extension "$extension"
    run_group "git clone -nv $domain/$org/$repo /tmp/$repo-$release" "git clone"
    cd /tmp/"$repo-$release/$sub_dir" || exit 1
    git checkout -q "$release"
    if ! [ "$(find . -maxdepth 1 -name '*.m4' -exec grep -H 'PHP_NEW_EXTENSION' {} \; | wc -l)" != "0" ]; then
      add_log "${cross:?}" "$domain/$org/$repo" "$domain/$org/$repo does not have a PHP extension"
    else
      if [ -e .gitmodules ]; then
        jobs="$(grep -c "\[submodule" .gitmodules)"
        run_group "git submodule update --jobs $jobs --init --recursive" "git submodule"
      fi
      [ "x$libraries" != "x" ] && run_group "add_libs $libraries" "add libraries"
      run_group "phpize" "phpize"
      run_group "sudo $prefix_opts ./configure $suffix_opts $opts" "configure"
      run_group "sudo make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu)" "make"
      run_group "sudo make install" "make install"
      enable_extension "$extension" "$prefix"
    fi
  )
  add_extension_log "$slug" "Installed from $domain/$org/$repo and enabled"
}
