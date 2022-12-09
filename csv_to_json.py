# -*- coding: utf-8 -*-

import argparse
import json
import glob
import numpy as np
import os
from pprint import pprint
import sys

import lib.io_utils as io
from lib.math_utils import *
from lib.utils import *

# input
parser = argparse.ArgumentParser()
parser.add_argument('-in', dest="INPUT_FILE", default="data/photographic_images.csv", help="File with metadata")
parser.add_argument('-sub', dest="SUBJECTS_FILE", default="data/photographic_subjects.csv", help="File with subject data")
parser.add_argument('-image', dest="IMAGE_FILES", default="images/photographic_thumbnails/*.jpg", help="Input file pattern")
parser.add_argument('-grid', dest="GRID_FILE", default="data/photographic_grid.csv", help="File with grid data")
parser.add_argument('-gsize', dest="GRID_SIZE", default="114x116", help="Grid size in cols x rows")
parser.add_argument('-msub', dest="MAX_SUBJECTS", default=64, type=int, help="Max number of subjects (includes 'other')")
parser.add_argument('-out', dest="OUTPUT_FILE", default="data/photographic_images.json", help="File for output")
a = parser.parse_args()

YEAR_RANGE = [1600, 2020]

gridW, gridH = tuple([int(t) for t in a.GRID_SIZE.split("x")])

# Make sure output dirs exist
io.makeDirectories(a.OUTPUT_FILE)

# retrieve data
fieldNames, data = io.readCsv(a.INPUT_FILE)
dataCount = len(data)
_, subjectData = io.readCsv(a.SUBJECTS_FILE)
grid = np.loadtxt(a.GRID_FILE, delimiter=",")
imageFiles = glob.glob(a.IMAGE_FILES)
imageFiles = sorted(imageFiles)
fileCount = len(imageFiles)
print("Loaded %s files" % fileCount)

# process subject data
subjectData = groupList(subjectData, "subject", sort=True)
subjectCount = len(subjectData)
mainSubjects = subjectData[:a.MAX_SUBJECTS] if subjectCount > a.MAX_SUBJECTS else subjectData
subjectLabels = [s["subject"] for s in mainSubjects]

print("Matching subjects...")
for i, d in enumerate(data):
    data[i]["challenge"] = d["cr"]
    subjects = []
    for j, s in enumerate(mainSubjects):
        for item in s["items"]:
            if item["id"] == d["id"]:
                subjects.append(j)
                break
    data[i]["subjects"] = subjects
    printProgress(i+1, dataCount)

if len(data) <= 0:
    print("No data found")
    sys.exit()

print("Matching metadata with image filenames...")
matchedEntries = []
for i, fn in enumerate(imageFiles):
    basefn = io.getFileBasename(fn)
    matched = False
    for j, entry in enumerate(data):
        id = entry["id"]
        if basefn == id:
            matchedEntries.append(j)
            matched = True
            break
    if not matched:
        print("Could not match %s" % basefn)
        matchedEntries.append(-1)
        sys.exit()
    printProgress(i+1, fileCount)

# use first entry to determine base URLs
model = data[0]

itemBaseUrl = io.getBaseUrl(model["url"])
print("Item base URL: %s" % itemBaseUrl)

imageBaseUrl = io.getBaseUrl(model["imageUrl"])
print("Image base URL: %s" % imageBaseUrl)

ids = ["" for i in range(gridW*gridH)]
filenames = ["" for i in range(gridW*gridH)]
titles = ["" for i in range(gridW*gridH)]
challenge = [[] for i in range(gridW*gridH)]
subjects = [[] for i in range(gridW*gridH)]

for fileIndex, dataIndex in enumerate(matchedEntries):
    entry = data[dataIndex]
    col, row = tuple(grid[fileIndex])
    gridIndex = int(round(row * gridW + col))
    ids[gridIndex] = entry["url"].split("/")[-1]
    filenames[gridIndex] = entry["imageUrl"].split("/")[-1]
    titles[gridIndex] = entry["title"]
    challenge[gridIndex] = entry["challenge"]
    subjects[gridIndex] = entry["subjects"]

jsonData = {
    "itemBaseUrl": itemBaseUrl,
    "imageBaseUrl": imageBaseUrl,
    "ids": ids,
    "filenames": filenames,
    "titles": titles,
    "challenge": challenge,
    "subjects": subjects,
    "subjectMeta": [[s["subject"], s["count"]] for s in mainSubjects]
}

with open(a.OUTPUT_FILE, 'w') as f:
    json.dump(jsonData, f)
