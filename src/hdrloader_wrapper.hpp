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
	if (args.Length() < 1) {
		v8::ThrowException(v8::Exception::TypeError(v8::String::New("Wrong number of arguments")));
		return scope.Close(v8::Undefined());
    }
	else {
		v8::String::Utf8Value filename(args[0]->ToString());
		path = std::string(*filename);
	}

	HDRLoaderResult hdr_result;
	bool ret = HDRLoader::load(path.c_str(), hdr_result);
	if (!ret)
	{
		result << "hdrloader failed";
	}
	else
	{
		result << "hdrloader ok" << " (width: " << hdr_result.width << ", height: " << hdr_result.height;
	}

    NanReturnValue(NanNew(result.str().c_str()));
  }

 private:

  hdrloader() {
  }
  ~hdrloader() {
	// delete[] result.cols;
	// delete[] result.expos;
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