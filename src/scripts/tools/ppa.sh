# Function to try to set ubuntu or debian version.
set_base_version_id() {
  [[ "$ID" =~ ubuntu|debian ]] && return;
  if ! [ -d "$dist_info_dir" ]; then
    sudo mkdir -p "$dist_info_dir"
    get -q -n "$dist_info_dir"/os_releases.csv https://raw.githubusercontent.com/shivammathur/setup-php/develop/src/configs/os_releases.csv
  fi
  for base in ubuntu debian; do
    [[ "$ID_LIKE" =~ $base ]] && ID="$base" && VERSION_ID="$(grep -hr -m 1 "$VERSION_CODENAME" /usr/share/distro-info | cut -d ',' -f 1 | cut -d ' ' -f 1)" && break
  done
}

# Function to try to set ubuntu or debian codename.
set_base_version_codename() {
  [[ "$ID" =~ ubuntu|debian ]] && return;
  if [[ "$ID_LIKE" =~ ubuntu ]]; then
    [[ -n "$UBUNTU_CODENAME" ]] && VERSION_CODENAME="$UBUNTU_CODENAME" && return;
    [ -e "$upstream_lsb" ] && VERSION_CODENAME=$(grep 'CODENAME' "$upstream_lsb" | cut -d '=' -f 2) && return;
    VERSION_CODENAME=$(grep -E -m1 'deb .*ubuntu.com' "$list_file" | cut -d ' ' -f 3) && VERSION_CODENAME=${VERSION_CODENAME%-*}
  elif [[ "$ID_LIKE" =~ debian ]] || command -v dpkg >/dev/null; then
    ID_LIKE=debian
    [[ -n "$DEBIAN_CODENAME" ]] && VERSION_CODENAME="$DEBIAN_CODENAME" && return;
    update_lists && VERSION_CODENAME=$(apt-cache show tzdata | grep -m 1 Provides | cut -d '-' -f 2)
  fi
}

# Function to set base os details
set_base_version() {
  if [ -e /tmp/os-release ]; then
    . /tmp/os-release
  else
    set_base_version_codename
    set_base_version_id
    printf "ID=%s\nVERSION_ID=%s\nVERSION_CODENAME=%s\n" "$ID" "$VERSION_ID" "$VERSION_CODENAME" | tee /tmp/os-release >/dev/null 2>&1
  fi
}

# Helper function to update package lists.
update_lists_helper() {
  list=$1
  command -v sudo >/dev/null && SUDO=sudo
  if [[ -n "$list" ]]; then
    ${SUDO} apt-get update -o Dir::Etc::sourcelist="$list" -o Dir::Etc::sourceparts="-" -o APT::Get::List-Cleanup="0"
  else
    ${SUDO} apt-get update
  fi
}

# Function to update the package lists.
update_lists() {
  local ppa=${1:-}
  local ppa_search=${2:-}
  local status_token=${3:-$ppa_search}
  local list=
  local status_file=/tmp/os_lists
  local hash_cmd
  if [[ -n "$ppa" && -n "$ppa_search" ]]; then
    if [ -f "$ppa_search" ]; then
      list="$ppa_search"
    else
      list="$(grep -Elr "$ppa_search" "$list_dir" 2>/dev/null | head -n 1)"
    fi
    hash_cmd="$(command -v sha256sum || command -v shasum)"
    if [ -n "$status_token" ] && [ -n "$hash_cmd" ]; then
      status_file=/tmp/os_lists_"$(echo -n "$status_token" | $hash_cmd | awk '{print $1}')"
    elif [ -n "$status_token" ]; then
      status_file=/tmp/os_lists_$(date +%s)
    fi
  elif [ -e "$list_file" ] && grep -Eq '^deb |^Types: *deb' "$list_file"; then
    list="$list_file"
  fi
  if [ ! -e "$status_file" ]; then
    update_lists_helper "$list" >/dev/null 2>&1
    echo '' | tee "$status_file" >/dev/null 2>&1
  fi
}

# Determine whether deb822 sources are the default on this system.
get_sources_format() {
  if [ -n "$sources_format" ]; then
    echo "$sources_format"
    return
  fi
  sources_format=deb
  if [ -e "$list_dir"/ubuntu.sources ] || [ -e "$list_dir"/debian.sources ]; then
    sources_format="deb822"
  elif ! [[ "$ID" =~ ubuntu|debian ]]; then
    find "$list_dir" -type f -name '*.sources' | grep -q . && sources_format="deb822"
  fi
  echo "$sources_format"
}

# Function to get sources file extension.
get_sources_extension() {
  [ "$1" = "deb822" ] && echo "sources" || echo "list"
}

# Function to escape regex special characters.
escape_regex() {
  printf '%s' "$1" | sed -e 's/[][\.^$*+?{}()|\/]/\\&/g'
}

# Function to merge two components strings.
merge_components() {
  local out=() t
  for t in $1 $2; do [[ $t && " ${out[*]} " != *" $t "* ]] && out+=("$t"); done
  printf '%s\n' "${out[*]}"
}

# Function to merge components from a file.
merge_components_from_file() {
  local path=$1
  local incoming=$2
  local current=
  if [ -n "$path" ] && [ -e "$path" ]; then
    if grep -Eq '^Components:' "$path"; then
      current="$(grep -E '^Components:' "$path" | head -n 1 | cut -d ':' -f 2 | xargs)"
    else
      current="$(sed -E -n 's/^deb[[:space:]]+(\[[^]]*\][[:space:]]+)?[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+//p' "$path" | head -n 1 | xargs)"
    fi
  fi
  local merged
  merged="$(merge_components "$current" "$incoming")"
  if [ -z "$merged" ] || [ "$merged" = "$current" ]; then
    return 1
  fi
  printf '%s\n' "$merged"
}

# Function to get repo patterns based on format.
get_repo_patterns() {
  local list_format=$1
  local ppa_url=$2
  local package_dist=$3
  local branches=$4
  local escaped_url
  local escaped_dist
  local escaped_branches
  escaped_url="$(escape_regex "$ppa_url")"
  escaped_dist="$(escape_regex "$package_dist")"
  escaped_branches="$(escape_regex "$branches")"
  local deb_primary="^deb[[:space:]]+(\\[[^]]*\\][[:space:]]+)?${escaped_url}[[:space:]]+${escaped_dist}[[:space:]]"
  local deb_secondary="^deb[[:space:]]+(\\[[^]]*\\][[:space:]]+)?${escaped_url}[[:space:]]+${escaped_dist}[[:space:]]+.*${escaped_branches}([[:space:]]|$)"
  local deb822_primary="^URIs: ${escaped_url}$"
  local deb822_secondary="^Suites: ${escaped_dist}$"
  if [ "$list_format" = "deb822" ]; then
    printf '%s|%s\n' "$deb822_primary" "$deb822_secondary"
  else
    printf '%s|%s\n' "$deb_primary" "$deb_secondary"
  fi
}

# Function to get fingerprint from an Ubuntu PPA.
ubuntu_fingerprint() {
  ppa="$1"
  ppa_uri="~${ppa%/*}/+archive/ubuntu/${ppa##*/}"
  get -s -n "" "${lp_api[0]}/$ppa_uri" | jq -er '.signing_key_fingerprint' 2>/dev/null \
  || get -s -n "" "${lp_api[1]}/$ppa_uri" | jq -er '.signing_key_fingerprint' 2>/dev/null \
  || get -s -n "" "$ppa_sp/keys/$ppa.fingerprint"
}


# Function to get fingerprint from a Debian PPA.
debian_fingerprint() {
  ppa=$1
  ppa_url=$2
  package_dist=$3
  release_pub=/tmp/"${ppa/\//-}".gpg
  get -q -n "$release_pub" "$ppa_url"/dists/"$package_dist"/Release.gpg
  gpg --list-packets "$release_pub" | grep -Eo 'fpr\sv4\s.*[a-zA-Z0-9]+' | head -n 1 | cut -d ' ' -f 3
}

# Function to add a GPG key.
add_key() {
  ppa=${1:-ondrej/php}
  ppa_url=$2
  package_dist=$3
  key_source=$4
  key_file=$5
  key_urls=("$key_source")
  if [[ "$key_source" =~ launchpadcontent.net|debian.org ]]; then
    fingerprint="$("${ID}"_fingerprint "$ppa" "$ppa_url" "$package_dist")"
    sks_params="op=get&options=mr&exact=on&search=0x$fingerprint"
    key_urls=("${sks[@]/%/\/pks\/lookup\?"$sks_params"}")
  fi
  key_urls+=("$ppa_sp/keys/$ppa.gpg")
  [ ! -e "$key_source" ] && get -q -n "$key_file" "${key_urls[@]}"
  if [[ "$(file "$key_file")" =~ .*('Public-Key (old)'|'Secret-Key') ]]; then
    sudo gpg --batch --yes --dearmor "$key_file" >/dev/null 2>&1 && sudo mv "$key_file".gpg "$key_file"
  fi
}

# Function to handle existing list files.
handle_existing_list() {
  local ppa=$1
  local list_format=$2
  local branches=$3
  local merged_components
  if [ -z "$check_lists_file" ]; then
    echo "Repository $ppa ($branches) already exists" && return 1
  fi
  if merged_components="$(merge_components_from_file "$check_lists_file" "$branches")"; then
    sudo rm -f "$check_lists_file" && printf '%s\n' "$merged_components" && return 0
  fi
  if [[ "$list_format" = "deb822" && "$check_lists_file" = *.list ]]; then
    sudo rm -f "$check_lists_file" && printf '%s\n' "$branches" && return 0
  fi
  echo "Repository $ppa ($branches) already exists" && return 1
}

# Function to write a list file.
write_list() {
  local type=$1
  local ppa=$2
  local url=$3
  local suite=$4
  local components=$5
  local key_file=$6
  local list_basename="${ppa%%/*}"-"$ID"-"${ppa#*/}"-"$suite"
  local arch
  arch="$(dpkg --print-architecture)"
  sudo rm -f "$list_dir"/"${ppa/\//-}".list "$list_dir"/"${ppa/\//-}".sources "$list_dir"/"$list_basename".list "$list_dir"/"$list_basename".sources || true
  if [ "$type" = "deb822" ]; then
    cat <<EOF | sudo tee "$list_dir"/"$list_basename".sources >/dev/null
Types: deb
URIs: $url
Suites: $suite
Components: $components
Architectures: $arch
Signed-By: $key_file
EOF
  else
    echo "deb [arch=$arch signed-by=$key_file] $url $suite $components" | sudo tee "$list_dir"/"$list_basename".list >/dev/null 2>&1
  fi
}

# Function to check if a PPA and its lists exist
check_lists() {
  local ppa=$1
  local primary=${2:-}
  local secondary=${3:-}
  local status_token=${4:-$primary}
  local match_file=
  check_lists_file=
  if [ -n "$primary" ]; then
    match_file=$(grep -Elr "$primary" "$list_dir" 2>/dev/null | head -n 1)
  fi
  if [ -z "$match_file" ] && [ -n "$secondary" ]; then
    match_file=$(grep -Elr "$secondary" "$list_dir" 2>/dev/null | head -n 1)
  fi
  if [ -n "$match_file" ]; then
    local list_count
    list_count="$(sudo find /var/lib/apt/lists -type f -name "*${ppa/\//_}*" | wc -l)"
    if [ "$list_count" = "0" ]; then
      update_lists "$ppa" "$match_file" "$status_token"
    fi
    check_lists_file="$match_file"
    return 0
  fi
  return 1
}

# Function to add a sources list.
add_list() {
  ppa=${1-ondrej/php}
  ppa_url=${2:-"$lpc_ppa/$ppa/ubuntu"}
  key_source=${3:-"$ppa_url"}
  package_dist=${4:-"$VERSION_CODENAME"}
  branches=${5:-main}
  local list_format
  local list_extension
  local status_token
  local resolved_branches
  local list_path=
  list_format="$(get_sources_format)"
  list_extension="$(get_sources_extension "$list_format")"
  status_token="${ppa_url}|${package_dist}|${branches}"
  IFS='|' read -r primary_pattern secondary_pattern <<< "$(get_repo_patterns "$list_format" "$ppa_url" "$package_dist" "$branches")"
  if check_lists "$ppa" "$primary_pattern" "$secondary_pattern" "$status_token"; then
    list_path="$check_lists_file"
    if resolved_branches="$(handle_existing_list "$ppa" "$list_format" "$branches")"; then
      branches="$resolved_branches"
    else
      [ -n "$resolved_branches" ] && echo "$resolved_branches" && return 1
    fi
    check_lists_file=
    IFS='|' read -r primary_pattern secondary_pattern <<< "$(get_repo_patterns "$list_format" "$ppa_url" "$package_dist" "$branches")"
    status_token="${ppa_url}|${package_dist}|${branches}"
  fi
  [ -e "$key_source" ] && key_file=$key_source || key_file="$key_dir"/"${ppa/\//-}"-keyring.gpg
  add_key "$ppa" "$ppa_url" "$package_dist" "$key_source" "$key_file"
  write_list "$list_format" "$ppa" "$ppa_url" "$package_dist" "$branches" "$key_file"
  list_path="$list_dir"/"${ppa%%/*}"-"$ID"-"${ppa#*/}"-"$package_dist"."$list_extension"
  update_lists "$ppa" "$list_path" "$status_token"
  . /etc/os-release
  return 0;
}

# Function to check if a PPA exists
check_ppa() {
  ppa=$1
  ppa_url=${2:-"$lpc_ppa/$ppa/ubuntu"}
  package_dist=${3:-"$VERSION_CODENAME"}
  branches=${4:-main}
  local list_format
  list_format="$(get_sources_format)"
  IFS='|' read -r primary_pattern secondary_pattern <<< "$(get_repo_patterns "$list_format" "$ppa_url" "$package_dist" "$branches")"
  local status_token
  status_token="${ppa_url}|${package_dist}|${branches}"
  if check_lists "$ppa" "$primary_pattern" "$secondary_pattern" "$status_token"; then
    return 0;
  else
    return 1;
  fi
}

# Function to remove a PPA.
remove_list() {
  ppa=${1-ondrej/php}
  [ -n "$2" ] && ppa_urls=("$2") || ppa_urls=("$lp_ppa/$ppa/ubuntu" "$lpc_ppa/$ppa/ubuntu")
  for ppa_url in "${ppa_urls[@]}"; do
    grep -lr "$ppa_url" "$list_dir" | xargs -n1 sudo rm -f
  done
  sudo rm -f "$key_dir"/"${ppa/\//-}"-keyring /tmp/os_lists* || true
}

# Function to check if ubuntu ppa is up
is_ubuntu_ppa_up() {
  ppa=${1:-ondrej/php}
  curl -s --connect-timeout 10 --max-time 10 --head --fail "$lpc_ppa/$ppa/ubuntu/dists/$VERSION_CODENAME/Release" > /dev/null
}

# Function to add the PPA mirror.
add_ppa_sp_mirror() {
  ppa=$1
  ppa_name="$(basename "$ppa")"
  remove_list "$ppa" || true
  [ "${debug:?}" = "debug" ] && add_list sp/"$ppa_name" "$ppa_sp/$ppa/ubuntu" "$ppa_sp/$ppa/ubuntu/key.gpg" "$VERSION_CODENAME" "main/debug"
  add_list sp/"$ppa_name" "$ppa_sp/$ppa/ubuntu" "$ppa_sp/$ppa/ubuntu/key.gpg"
}

# Function to add a PPA.
add_ppa() {
  set_base_version
  ppa=${1:-ondrej/php}
  if [[ "$ID" = "ubuntu" || "$ID_LIKE" =~ ubuntu ]] && [[ "$ppa" =~ "ondrej/" ]]; then
    if is_ubuntu_ppa_up "$ppa" ; then
      [ "${runner:?}" = "self-hosted" ] && find "$list_dir" -type f -name 'sp*' -exec grep -qF "${sp/https:\/\/}" {} \; -delete
      [ "${debug:?}" = "debug" ] && add_list "$ppa" "$lpc_ppa/$ppa/ubuntu" "$lpc_ppa/$ppa/ubuntu" "$VERSION_CODENAME" "main/debug"
      add_list "$ppa"
    elif [ "$ppa" = "ondrej/php" ]; then
      add_ppa_sp_mirror "$ppa"
    else
      add_log "${cross:?}" "$ppa" "PPA $ppa is not available"
    fi
  elif [[ "$ID" = "debian" || "$ID_LIKE" =~ debian ]] && [[ "$ppa" =~ "ondrej/" ]]; then
    [ "${debug:?}" = "debug" ] && add_list "$ppa" "$sury"/"${ppa##*/}"/ "$sury"/"${ppa##*/}"/apt.gpg "$VERSION_CODENAME" "main/debug"
    add_list "$ppa" "$sury"/"${ppa##*/}"/ "$sury"/"${ppa##*/}"/apt.gpg
  else
    add_list "$ppa"
  fi
  exit_code="$?"
  . /etc/os-release
  return $exit_code
}

# Function to update a PPA.
update_ppa() {
  set_base_version
  ppa=${1:-ondrej/php}
  ppa_url=${2:-"$lpc_ppa/$ppa/ubuntu"}
  package_dist=${4:-"$VERSION_CODENAME"}
  branches=${5:-main}
  local list_format
  list_format="$(get_sources_format)"
  IFS='|' read -r primary_pattern secondary_pattern <<< "$(get_repo_patterns "$list_format" "$ppa_url" "$package_dist" "$branches")"
  local list_path
  list_path="$(grep -Elr "$primary_pattern" "$list_dir" 2>/dev/null | head -n 1)"
  if [ -z "$list_path" ] && [ -n "$secondary_pattern" ]; then
    list_path="$(grep -Elr "$secondary_pattern" "$list_dir" 2>/dev/null | head -n 1)"
  fi
  local status_token
  status_token="${ppa_url}|${package_dist}|${branches}"
  update_lists "$ppa" "${list_path:-$primary_pattern}" "$status_token"
  . /etc/os-release
}

# Variables
sources_format=
check_lists_file=
list_dir='/etc/apt/sources.list.d'
list_file="/etc/apt/sources.list.d/$ID.sources"
[ -e "$list_file" ] || list_file='/etc/apt/sources.list'
upstream_lsb='/etc/upstream-release/lsb-release'
lp_api=(
  'https://api.launchpad.net/1.0'
  'https://api.launchpad.net/devel'
)
lp_ppa='http://ppa.launchpad.net'
lpc_ppa='https://ppa.launchpadcontent.net'
key_dir='/usr/share/keyrings'
dist_info_dir='/usr/share/distro-info'
sury='https://packages.sury.org'
ppa_sp='https://ppa.setup-php.com'
sp='https://setup-php.com'
sks=(
  'https://keyserver.ubuntu.com'
  'https://pgp.mit.edu'
  'https://keys.openpgp.org'
)
