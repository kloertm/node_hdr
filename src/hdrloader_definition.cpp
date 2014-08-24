#include <node.h>
#include <v8.h>

#include <nan.h>

#include "hdrloader_wrapper.hpp"

namespace hdrloader {

void Init(v8::Handle<v8::Object> exports) {
  hdrloader::Init(exports);
}

}  // namespace hdrloader

NODE_MODULE(hdrloader, hdrloader::Init)