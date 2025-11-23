patch_amqp() {
  if [[ $(printf '%s\n%s\n' "${version:?}" "8.5" | sort -V | head -n1) == "8.5" ]]; then
    get -q -n amqp_connection_resource.c https://raw.githubusercontent.com/remicollet/php-amqp/977449987412a3d5c59a036dbab8b6d67764bb3e/amqp_connection_resource.c
  fi
}