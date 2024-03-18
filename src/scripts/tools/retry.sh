function retry {
    local try=0

    until "$@"; do
        exit_code="$?"
        try=$((try + 1))

        if [ $try -lt 10 ]; then
            sleep "$((2 ** try))"
        else
            return $exit_code
        fi
    done

    return 0
}

function git_retry {
    retry git "$@"
}