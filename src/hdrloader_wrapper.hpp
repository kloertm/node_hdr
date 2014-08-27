#ifndef HDRLOADER_HPP
#define HDRLOADER_HPP

#include <node.h>
#include <v8.h>

#include <nan.h>

#include <sstream>

#include "hdrloader.h"

namespace hdrloader {

class hdrloader : public node::ObjectWrap {
 public:
  static void Init(v8::Handle<v8::Object> exports) {
    NanScope();

    v8::Local<v8::FunctionTemplate> tpl = NanNew<v8::FunctionTemplate>(New);
    tpl->SetClassName(NanNew("hdrloader"));
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    NODE_SET_PROTOTYPE_METHOD(tpl, "toString", toString);
	NODE_SET_PROTOTYPE_METHOD(tpl, "loadHDR", loadHDR);

    NanAssignPersistent(constructor, tpl->GetFunction());
    exports->Set(NanNew("hdrloader"), tpl->GetFunction());
  }

  static NAN_METHOD(toString) {
    const hdrloader* obj = node::ObjectWrap::Unwrap<hdrloader>(args.This());
    NanScope();

    std::ostringstream result;
    result << "hdrloader namespace";

    NanReturnValue(NanNew(result.str().c_str()));
  }
  
  static NAN_METHOD(loadHDR) {
    const hdrloader* obj = node::ObjectWrap::Unwrap<hdrloader>(args.This());
    NanScope();

	std::ostringstream result;
	std::string path;
	int dest_width = 0;
	int dest_height = 0;
	if (args.Length() < 3) {
		v8::ThrowException(v8::Exception::TypeError(v8::String::New("Wrong number of arguments")));
		return scope.Close(v8::Undefined());
	}
	else {
		v8::String::Utf8Value filename(args[0]->ToString());
		v8::Local<v8::Integer> dest_w = args[1]->ToUint32();
		v8::Local<v8::Integer> dest_h = args[2]->ToUint32();
		path = std::string(*filename);
		dest_width = dest_w->Value();
		dest_height = dest_h->Value();
	}

	HDRLoaderResult hdr_result;
	bool ret = HDRLoader::load(path.c_str(), hdr_result, dest_width, dest_height);
	size_t hdr_buff_len = 0;
	size_t hdr_meta_len = sizeof(int) * 2;
	size_t hdr_total_data_len = 0;
	int hdr_width = 0;
	int hdr_height = 0;
	v8::Local<v8::Object> hdr_buff;
	char* temp_buff;
	if (ret) {
	    hdr_width = hdr_result.width;
	    hdr_height = hdr_result.height;
	    hdr_buff_len = sizeof(float) * hdr_width * hdr_height * 3;
	}

	hdr_total_data_len = hdr_buff_len + hdr_meta_len;
	hdr_buff = NanNewBufferHandle(hdr_total_data_len);
	temp_buff = (char *) malloc(hdr_total_data_len);
	memcpy(temp_buff, (char *) &hdr_width, sizeof(int));
	memcpy(temp_buff + sizeof(int), (char *) &hdr_height, sizeof(int));
	if (hdr_buff_len > 0)
	  memcpy(temp_buff + sizeof(int) * 2, (void *) hdr_result.cols, hdr_buff_len);
	memcpy(node::Buffer::Data(hdr_buff), (void *) temp_buff, hdr_total_data_len);
	
	// free
	free(temp_buff);
	if (hdr_buff_len > 0) {
	  delete[] hdr_result.expos;
	  delete[] hdr_result.cols;
	}
	
	NanReturnValue(hdr_buff);
  }

 private:

  hdrloader() {
  }
  ~hdrloader() {
  }

  static NAN_METHOD(New) {
    NanScope();

    if (args.IsConstructCall()) {
      hdrloader* obj = new hdrloader();
      obj->Wrap(args.This());
      NanReturnValue(args.This());
    } else {
      v8::Local<v8::Function> ctr = NanNew(constructor);
      // v8::Local<v8::Value> argv[] = {NULL};
      NanReturnValue(
          ctr->NewInstance()
      );
    }
  }

  static v8::Persistent<v8::Function> constructor;
 private:
  bool null_;
};

v8::Persistent<v8::Function> hdrloader::constructor;

}  // namespace hdrloader

#endif  // HDRLOADER_HPP