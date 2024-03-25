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
    printf "ID=%s\nVERSION_ID=%s\nVERSION_CODENAME=%s\n" "$ID" "$VERSION_ID" "$VERSION_CODENAME" | tee /tmp/os-release 
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
  local list=
  status_file=/tmp/os_lists
  if [[ -n "$ppa" && -n "$ppa_search" ]]; then
    list="$list_dir"/"$(basename "$(grep -lr "$ppa_search" "$list_dir")")"
    status_file=/tmp/"${ppa/\//_}"
  elif [ -e "$list_file" ] && grep -Eq '^deb ' "$list_file"; then
    list="$list_file"
  fi
  if [ ! -e "$status_file" ]; then
    update_lists_helper "$list" 
    echo '' | tee "$status_file" 
  fi
}

# Function to get fingerprint from an Ubuntu PPA.
ubuntu_fingerprint() {
  ppa=$1
  get -s -n "" "$lp_api"/~"${ppa%/*}"/+archive/"${ppa##*/}" | jq -r '.signing_key_fingerprint'
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
  if [[ "$key_source" =~ launchpad.net|debian.org|setup-php.com ]]; then
    fingerprint="$("${ID}"_fingerprint "$ppa" "$ppa_url" "$package_dist")"
    sks_params="op=get&options=mr&exact=on&search=0x$fingerprint"
    key_urls=("${sks[@]/%/\/pks\/lookup\?"$sks_params"}")
  fi
  [ ! -e "$key_source" ] && get -q -n "$key_file" "${key_urls[@]}"
  if [[ "$(file "$key_file")" =~ .*('Public-Key (old)'|'Secret-Key') ]]; then
    sudo gpg --batch --yes --dearmor "$key_file"  && sudo mv "$key_file".gpg "$key_file"
  fi
}

# Function to check if a PPA and its lists exist
check_lists() {
  ppa=$1
  ppa_search=$2
  if grep -Eqr "$ppa_search" "$list_dir"; then
    list_count="$(sudo find /var/lib/apt/lists -type f -name "*${ppa/\//_}*" | wc -l)"
    if [ "$list_count" = "0" ]; then
      update_lists "$ppa" "$ppa_search"
    fi
    return 0;
  else
    return 1;
  fi
}

# Function to add a sources list.
add_list() {
  ppa=${1-ondrej/php}
  ppa_url=${2:-"$lp_ppa/$ppa/ubuntu"}
  key_source=${3:-"$ppa_url"}
  package_dist=${4:-"$VERSION_CODENAME"}
  branches=${5:-main}
  ppa_search="deb .*$ppa_url $package_dist .*$branches"
  if check_lists "$ppa" "$ppa_search"; then
    echo "Repository $ppa already exists";
    return 1;
  else
    arch=$(dpkg --print-architecture)
    [ -e "$key_source" ] && key_file=$key_source || key_file="$key_dir"/"${ppa/\//-}"-keyring.gpg
    add_key "$ppa" "$ppa_url" "$package_dist" "$key_source" "$key_file"
    echo "deb [arch=$arch signed-by=$key_file] $ppa_url $package_dist $branches" | sudo tee -a "$list_dir"/"${ppa/\//-}".list 
    update_lists "$ppa" "$ppa_search"
    . /etc/os-release
  fi
  return 0;
}

# Function to check if a PPA exists
check_ppa() {
  ppa=$1
  ppa_url=${2:-"$lp_ppa/$ppa/ubuntu"}
  package_dist=${3:-"$VERSION_CODENAME"}
  branches=${4:-main}
  ppa_search="deb .*$ppa_url $package_dist .*$branches"
  if check_lists "$ppa" "$ppa_search"; then
    return 0;
  else
    return 1;
  fi
}

# Function to remove a PPA.
remove_list() {
  ppa=${1-ondrej/php}
  ppa_url=${2:-"$lp_ppa/$ppa/ubuntu"}
  grep -lr "$ppa_url" "$list_dir" | xargs -n1 sudo rm -f
  sudo rm -f "$key_dir"/"${ppa/\//-}"-keyring || true
}

# Function to add a PPA.
add_ppa() {
  set_base_version
  ppa=${1:-ondrej/php}
  if [[ "$ID" = "ubuntu" || "$ID_LIKE" =~ ubuntu ]] && [[ "$ppa" =~ "ondrej/" ]]; then
    [ "${debug:?}" = "debug" ] && add_list "$ppa" "$lp_ppa/$ppa/ubuntu" "$lp_ppa/$ppa/ubuntu" "$VERSION_CODENAME" "main/debug"
    add_list "$ppa"
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
  ppa_url=${2:-"$lp_ppa/$ppa/ubuntu"}
  package_dist=${4:-"$VERSION_CODENAME"}
  branches=${5:-main}
  ppa_search="deb .*$ppa_url $package_dist .*$branches"
  update_lists "$ppa" "$ppa_search"
  . /etc/os-release
}

# Variables
list_file='/etc/apt/sources.list'
list_dir="$list_file.d"
upstream_lsb='/etc/upstream-release/lsb-release'
lp_api='https://api.launchpad.net/1.0'
lp_ppa='http://ppa.launchpad.net'
key_dir='/usr/share/keyrings'
dist_info_dir='/usr/share/distro-info'
sury='https://packages.sury.org'
sks=(
  'https://keyserver.ubuntu.com'
  'https://pgp.mit.edu'
  'https://keys.openpgp.org'
)
