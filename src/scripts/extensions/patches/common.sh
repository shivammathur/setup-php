process_file() {
    local file=$1
    sed -i '0,/#include.*\(php_lcg.h\|php_mt_rand.h\|php_rand.h\|standard\/php_random\.h\).*/s//\#include <ext\/random\/php_random.h>/' "$file"
    sed -i '/#include.*\(php_lcg.h\|php_mt_rand.h\|php_rand.h\|standard\/php_random\.h\)/d' "$file"
}

export -f process_file

# Compare with 8.3 so it runs only on 8.4 and above
if [[ $(printf "%s\n%s" "${version:?}" "8.3" | sort -V | head -n1) != "$version" ]]; then
  find . -type f \( -name "*.c" -o -name "*.h" \) -exec bash -c 'process_file "$0"' {} \;
fi
