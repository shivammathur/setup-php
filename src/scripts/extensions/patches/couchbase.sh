patch_couchbase() {
  local operation_queue query_index_manager
  operation_queue=src/deps/couchbase-cxx-client/core/mcbp/operation_queue.cxx
  query_index_manager=src/deps/couchbase-cxx-client/core/impl/query_index_manager.cxx
  if [ -e "$operation_queue" ] && ! grep -q '^#include <algorithm>' "$operation_queue"; then
    sed -i.bak '/^#include <memory>/i#include <algorithm>' "$operation_queue"
  fi
  if [ -e "$query_index_manager" ] && ! grep -q '^#include <algorithm>' "$query_index_manager"; then
    sed -i.bak '/^#include <utility>/i#include <algorithm>' "$query_index_manager"
  fi
  rm -f "$operation_queue.bak" "$query_index_manager.bak"
}
