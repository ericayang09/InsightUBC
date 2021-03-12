import {InsightDatasetKind, InsightError, } from "./controller/IInsightFacade";
import {Dataset, } from "./controller/InsightFacade";
import * as fs from "fs";

export function validDataSetID(key: string): boolean {
    if (key == null ||                          // string != null
        !key ||                                 // string not undefined
        key.trim().length === 0 ||              // cannot be all whitespaces
        key.includes("_")) {                    // cannot contain underscore
        return false;
    } else {
        return true;
    }
}

export function existingDataSetID(id: string, datasetIDs: string[]): boolean {
    for (const oneID of datasetIDs) {
        if (oneID === id) {
            return true;
        }
    }
    return false;
}

export function validateDataSetKind(kind: InsightDatasetKind): boolean {
    if (kind == null ||
        !kind) {
        return false;
    } else {
        return true;
    }
}

export function validJSON(object: any): boolean {
    try {
        JSON.parse(object);
    } catch (e) {
        return false;
    }
    return true;
}

// let files: any[] = [];
// let zip = new JSZip();
// zip.loadAsync(content, {base64: true}).then((zipFile) => {
//     zipFile.folder("courses").forEach((relativePath, file) => {
//         files.push(file.async("string"));
//     });
//     if (files.length === 0) {
//         return Promise.reject(new InsightError("error: Empty Folder"));
//     }
//     return Promise.all(files);
// }).then((returnedFile) => {
//     // parse the file for individual sections
//     let data: Section[] = [];
//     for (let file of returnedFile) {
//         let tempSection: Section[] = parseData(file);
//         if (tempSection.length > 0 && tempSection != null) {
// add sections to a list of sections:data
//             tempSection.forEach((section) => data.push(section));
//         }
//     }
//     if (data.length === 0) {
//         return reject(new InsightError("error: No Valid Sections"));
//     } else { // adding to memory
//         let thisDataSet: Dataset = {id: id, sections: data, kind: InsightDatasetKind.Courses};
//         const insightDataset: InsightDataset
//             = {id: id, kind: InsightDatasetKind.Courses, numRows: data.length};
//         this.insightDatasets.push(insightDataset);
//         this.datasets.push(thisDataSet);
//         this.idList.push(id);
//     }
//     // saving to disk
//     // used information provided at
//     // stackoverflow.com/questions/42179037/writing-json-object-to-a-json-file-with-fs-writefilesync
//     try {
//         fs.writeFileSync("./data/" + id, JSON.stringify(data));
//     } catch (e) {
//         return reject(new InsightError("error: unable to write to disk"));
//     }
//     res(this.idList);
// }).catch((error: any) => {
//     return reject(new InsightError("error: not all files are valid"));
// });
