# Function to parse extension environment variables
parse_args() {
  local extension=${1%-*}
  suffix=$(echo "$2" | tr '[:lower:]' '[:upper:]')
  up_ext_name=$(echo "$extension" | tr '[:lower:]' '[:upper:]')
  var="${extension}_${suffix}"
  up_var="${up_ext_name}_${suffix}"
  ! [[ "$suffix" =~ .*PREFIX|LIBS|PATH.* ]] && hyp='-'
  output=$(echo "${!var} ${!up_var}" | sed "s/, *$hyp/ $hyp/g" | sed -E "s/^,|,$//g")
  echo "$output" | xargs -n 1 | sort | uniq | xargs
}

# Function to parse configure options for pecl
# Make sure we have all options in name="value" form i.e XML properties.
parse_pecl_configure_options() {
  configure_opts=$(echo "$1" | sed -E -e "s#['\"]|--##g")
  IFS=' ' read -r -a opts_array <<< "$configure_opts"
  output_opts=()
  for opt in "${opts_array[@]}"; do
    [ "${opt##*=}" != "${opt%=*}" ] && value="${opt##*=}" || value=yes
    output_opts+=("${opt%=*}=\"$value\"")
  done
  echo "${output_opts[@]}"
}

# Function to log if a library is installed
add_lib_log() {
  local lib=$1
  if check_lib "$lib"; then
    add_log "${tick:?}" "$lib" "Installed"
  else
    add_log "${cross:?}" "$lib" "Could not install $lib"
  fi
}

# Function to check if a library is installed
check_lib() {
  local lib=$1
  if [ "$(uname -s)" = "Linux" ]; then
    [ "x$(dpkg -s "$lib" 2>/dev/null | grep Status)" != "x" ]
  else
    [ "x$(find "${brew_prefix:?}"/Cellar -maxdepth 1 -name "$lib")" != "x" ]
  fi
}

# Function to add a library on linux
add_linux_libs() {
  local lib=$1
  if ! check_lib "$lib"; then
    install_packages "$lib"  || true
  fi
  add_lib_log "$lib"
}

# Function to add a library on macOS
add_darwin_libs() {
  local lib=$1
  if ! check_lib "$lib"; then
    brew install "$lib"  || true
    if [[ "$lib" = *@* ]]; then
      brew link --overwrite --force "$lib"  || true
    fi
  fi
  add_lib_log "$lib"
}

# Function to add required libraries
add_libs() {
  local all_libs=("$@")
  for lib in "${all_libs[@]}"; do
    if [ "$(uname -s)" = "Linux" ]; then
      add_linux_libs "$lib"
    else
      add_darwin_libs "$lib"
    fi
  done
}

# Function to run command in a group
run_group() {
  local command=$1
  local log=$2
  echo "$command" | sudo tee ./run_group.sh 
  echo "$GROUP$log"
  . ./run_group.sh
  rm ./run_group.sh
  echo "$END_GROUP"
}

patch_extension() {
  local extension=$1
  if [ -e "${scripts:?}"/extensions/patches/"$extension".sh ]; then
    # shellcheck source=.
    . "${scripts:?}"/extensions/patches/"$extension".sh
    patch_"${extension}"
  fi
}

fetch_extension() {
  local extension=$1
  local fetch=$2
  if [ "$fetch" = "clone" ]; then
    run_group "git clone -nv $url/$org/$repo /tmp/$repo-$release" "git clone"
    cd /tmp/"$repo-$release" || exit 1
    git checkout -q "$release"
    cd "$sub_dir" || exit 1
    if [ -e .gitmodules ]; then
      jobs="$(grep -c "\[submodule" .gitmodules)"
      run_group "git submodule update --jobs $jobs --init --recursive" "git submodule"
    fi
  elif [ "$fetch" = "get" ]; then
    get -q -n /tmp/"$extension".tar.gz "$url/$org/$repo/archive/$release.tar.gz"
    tar -xzf /tmp/"$extension".tar.gz -C /tmp
    cd /tmp/"$repo"-"$release"/"$sub_dir" || exit
  elif [ "$fetch" = "pecl" ]; then
    source="pecl"
    pecl_name=${extension/http/pecl_http}
    get -q -n /tmp/"$pecl_name".tgz https://pecl.php.net/get/"$pecl_name"-"$release".tgz
    tar -xzf /tmp/"$pecl_name".tgz -C /tmp
    cd /tmp/"$pecl_name"-"$release" || exit
  fi
}

# Function to install extension from a git repository
add_extension_from_source() {
  local extension="${1/pecl_/}"
  local url=$2
  local org=$3
  local repo=$4
  local release=$5
  local prefix=$6
  local fetch=${7:-clone}
  slug="$extension-$release"
  source="$url/$org/$repo"
  libraries="$(parse_args "$extension" LIBS) $(parse_args "$extension" "$(uname -s)"_LIBS)"
  opts="$(parse_args "$extension" CONFIGURE_OPTS)"
  prefix_opts="$(parse_args "$extension" CONFIGURE_PREFIX_OPTS)"
  suffix_opts="$(parse_args "$extension" CONFIGURE_SUFFIX_OPTS)"
  sub_dir="$(parse_args "$extension" PATH)"
  step_log "Setup $slug"
  (
    add_devtools phpize 
    disable_extension_helper "$extension"
    fetch_extension "$extension" "$fetch"
    if ! [ "$(find . -maxdepth 1 -name '*.m4' -exec grep -H 'PHP_NEW_EXTENSION' {} \; | wc -l)" != "0" ]; then
      add_log "${cross:?}" "$source" "$source does not have a PHP extension"
    else
      [[ -n "${libraries// }" ]] && run_group "add_libs $libraries" "add libraries"
      [ "${debug:?}" = "debug" ] && suffix_opts="$suffix_opts --enable-debug"
      patch_extension "$extension" 
      run_group "phpize" "phpize"
      run_group "sudo $prefix_opts ./configure $suffix_opts $opts" "configure"
      run_group "sudo make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu)" "make"
      run_group "sudo make install" "make install"
      enable_extension "$extension" "$prefix"
    fi
  )
  add_extension_log "$slug" "Installed from $source and enabled"
}
