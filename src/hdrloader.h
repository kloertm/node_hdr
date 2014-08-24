
/***********************************************************************************
	Created:	17:9:2002
	FileName: 	hdrloader.h
	Author:		Igor Kravtchenko
	
	Info:		Load HDR image and convert to a set of float32 RGB triplet.
************************************************************************************/

#ifndef HDR_LOADER_DOT_H
#define HDR_LOADER_DOT_H

class HDRLoaderResult {
public:
	int width, height;
	// each pixel takes 3 float32, each component can be of any value...
	float *cols;
	int* expos;
};

class HDRLoader {
public:
	static bool load(const char *fileName, HDRLoaderResult &res);
};

#endif