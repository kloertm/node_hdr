
/***********************************************************************************
	Created:	17:9:2002
	FileName: 	hdrloader.cpp
	Author:		Igor Kravtchenko
	
	Info:		Load HDR image and convert to a set of float32 RGB triplet.
************************************************************************************/

#include "hdrloader.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

typedef unsigned char RGBE[4];
#define R			0
#define G			1
#define B			2
#define E			3

#define  MINELEN	8				// minimum scanline length for encoding
#define  MAXELEN	0x7fff			// maximum scanline length for encoding

static void workOnRGBE(RGBE *scan, int len, float *cols, int *expos);
static bool decrunch(RGBE *scanline, int len, FILE *file);
static bool oldDecrunch(RGBE *scanline, int len, FILE *file);

bool HDRLoader::load(const char *fileName, HDRLoaderResult &res, int dest_width, int dest_height)
{
	int i;
	char str[200];
	FILE *file;

	file = fopen(fileName, "rb");
	if (!file)
		return false;

	fread(str, 10, 1, file);
	if (memcmp(str, "#?RADIANCE", 10)) {
		fclose(file);
		return false;
	}

	fseek(file, 1, SEEK_CUR);

	//char cmd[200];
	//i = 0;
	char c = 0, oldc;
	while(true) {
		oldc = c;
		c = fgetc(file);
		if (c == 0xa && oldc == 0xa)
			break;
	//	cmd[i++] = c;
	}

	char reso[200];
	i = 0;
	while(true) {
		c = fgetc(file);
		reso[i++] = c;
		if (c == 0xa)
			break;
	}

	int w, h;
	if (!sscanf(reso, "-Y %ld +X %ld", &h, &w)) {
		fclose(file);
		return false;
	}

	res.width = w;
	res.height = h;

	float *cols = new float[w * h * 3];
	int *expos = new int[w * h];
	res.cols = cols;
	res.expos = expos;

	RGBE *scanline = new RGBE[w];
	if (!scanline) {
		fclose(file);
		return false;
	}

	// convert image 
	for (int y = h - 1; y >= 0; y--) {
		if (decrunch(scanline, w, file) == false)
			break;
		workOnRGBE(scanline, w, cols, expos);
		cols += w * 3;
		expos += w;
	}

	delete [] scanline;
	fclose(file);
	
	// resize if needed
	if (dest_width > 0 && dest_height > 0)
	{
		float *resized_cols = new float[dest_width * dest_height * 3];
		const float tx = dest_width / float(w);
		const float ty = dest_height / float(h);
		
		for (int j = 0 ; j < dest_height ; ++j)
		{
			for (int i = 0 ; i < dest_width ; ++i)
			{
				for (int k = 0 ; k < 3 ; ++k)
				{
					float xa = float(i) / tx;
					float xb = xa + 1.0f;
					float xc = xa;
					float xd = xa + 1.0f;
					float ya = float(j) / ty;
					float yb = ya;
					float yc = ya + 1.0f;
					float yd = ya + 1.0f;
					
					if (xb >= w) xb--;
					if (xd >= w) xd--;
					if (yc >= h) yc--;
					if (yd >= h) yd--;
					float alpha = float(i) / tx - xa;
					float beta = float(j) / ty - ya;
					float pa = res.cols[int((ya * w + xa) * 3 + k)];
					float pb = res.cols[int((yb * w + xb) * 3 + k)];
					float pc = res.cols[int((yc * w + xc) * 3 + k)];
					float pd = res.cols[int((yd * w + xd) * 3 + k)];
					float out = (1.0f - alpha) * (1.0f - beta) * pa +
						alpha * (1.0f - beta) * pb +
						(1.0f - alpha) * beta * pc +
						alpha * beta * pd;
					resized_cols[int((j * dest_height + i) * 3 + k)] = out;
				}
			}
		}
		
		// Free up previous resource
		delete[] res.cols;
		res.cols = resized_cols;
		res.width = dest_width;
		res.height = dest_height;
	}

	return true;
}
  
float convertComponent(int expo, int val)
{
	float v = val / 256.0f;
	float d = (float) pow(2.0f, expo);
	return v * d;
}

void workOnRGBE(RGBE *scan, int len, float *cols, int *expos)
{
	while (len-- > 0) {
		int expo = scan[0][E] - 128;
		expos[0] = scan[0][E];
		cols[0] = convertComponent(expo, scan[0][R]);
		cols[1] = convertComponent(expo, scan[0][G]);
		cols[2] = convertComponent(expo, scan[0][B]);
		cols += 3;
		expos += 1;
		scan++;
	}
}

bool decrunch(RGBE *scanline, int len, FILE *file)
{
	int  i, j;
					
	if (len < MINELEN || len > MAXELEN)
		return oldDecrunch(scanline, len, file);

	i = fgetc(file);
	if (i != 2) {
		fseek(file, -1, SEEK_CUR);
		return oldDecrunch(scanline, len, file);
	}

	scanline[0][G] = fgetc(file);
	scanline[0][B] = fgetc(file);
	i = fgetc(file);

	if (scanline[0][G] != 2 || scanline[0][B] & 128) {
		scanline[0][R] = 2;
		scanline[0][E] = i;
		return oldDecrunch(scanline + 1, len - 1, file);
	}

	// read each component
	for (i = 0; i < 4; i++) {
	    for (j = 0; j < len; ) {
			unsigned char code = fgetc(file);
			if (code > 128) { // run
			    code &= 127;
			    unsigned char val = fgetc(file);
			    while (code--)
					scanline[j++][i] = val;
			}
			else  {	// non-run
			    while(code--)
					scanline[j++][i] = fgetc(file);
			}
		}
    }

	return feof(file) ? false : true;
}

bool oldDecrunch(RGBE *scanline, int len, FILE *file)
{
	int i;
	int rshift = 0;
	
	while (len > 0) {
		scanline[0][R] = fgetc(file);
		scanline[0][G] = fgetc(file);
		scanline[0][B] = fgetc(file);
		scanline[0][E] = fgetc(file);
		if (feof(file))
			return false;

		if (scanline[0][R] == 1 &&
			scanline[0][G] == 1 &&
			scanline[0][B] == 1) {
			for (i = scanline[0][E] << rshift; i > 0; i--) {
				memcpy(&scanline[0][0], &scanline[-1][0], 4);
				scanline++;
				len--;
			}
			rshift += 8;
		}
		else {
			scanline++;
			len--;
			rshift = 0;
		}
	}
	return true;
}
