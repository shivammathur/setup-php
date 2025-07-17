. /home/runner/work/setup-php/setup-php/src/scripts/linux.sh 8.4 production
step_log "Setup Tools"
add_tool https://github.com/shivammathur/composer-cache/releases/latest/download/composer-8.4-stable.phar,https://dl.cloudsmith.io/public/shivammathur/composer-cache/raw/files/composer-8.4-stable.phar,https://getcomposer.org/composer-stable.phar composer latest
step_log "Sponsor setup-php"
add_log "$tick" "setup-php" "https://setup-php.com/sponsor"