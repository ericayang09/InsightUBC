import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, } from "./IInsightFacade";

import * as dataSetHelpers from "../dataSetHelpers";
import {existingDataSetID, validateDataSetKind, validJSON} from "../dataSetHelpers";

import {validateQuery} from "../QueryValidateLibrary";
import {performQueryAfterValidation} from "../QueryPerformLibrary";
import * as JSZip from "jszip";
import * as fs from "fs";

// Represents a dataset
export interface Dataset {
    // dataset id so we can pick this dataset when querying
    id: string;
    // array including all sections within this dataset
    sections: Section[];
}

// Represents a section read from dataset
export interface Section {
    Section: string;

    // json key         s fields
    Subject: string;    // dept
    Course: string;     // id
    Professor: string;  // instructor
    Title: string;      // title
    id: string;         // uuid

    // json key         m fields
    Avg: number;        // avg
    Pass: number;       // pass
    Fail: number;       // fail
    Audit: number;      // audit
    Year: number;       // year
}

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    // All datasets kept track of by this class
    public datasets: Dataset[] = [];
    public idList: string[] = [];

    public addDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<string[]> {
        return new Promise<string[]>((res, reject) => {
        if (!dataSetHelpers.validDataSetID(id)) {
            return reject(new InsightError("error: Invalid DataSet ID")); }
        if (existingDataSetID(id, this.idList)) {
            return reject(new InsightError("error: Pre-existing DataSet with this ID")); }
        if (!validateDataSetKind(kind)) {
            return reject(new InsightError("error: Invalid Dataset Kind")); }
        try {
            if (!fs.existsSync("./data")) { fs.mkdirSync("./data"); }
        } catch (e) {
            return Promise.reject(new InsightError("error: unable to add file to disk"));
        }
        // return new Promise<string[]>((res, reject) => {
        if (kind === InsightDatasetKind.Courses && !existingDataSetID(id, this.idList)) {
                let files: any[] = [];
                let zip = new JSZip();
                zip.loadAsync(content, {base64: true}).then((zipFile) => {
                    zipFile.folder("courses").forEach((relativePath, file) => {
                        files.push(file.async("string"));
                    });
                    if (files.length === 0) {
                        return Promise.reject(new InsightError("error: Empty Folder"));
                    }
                    return Promise.all(files);
                }).then((returnedFile) => {
                    // parse the file for individual sections
                    let data: Section[] = [];
                    for (let file of returnedFile) {
                        let tempSection: Section[] = parseData(file);
                        if (tempSection.length > 0 && tempSection != null) { // add sections to a temp list of sections
                            tempSection.forEach((section) => data.push(section));
                        }
                    }
                    if (data.length === 0) {
                        return reject(new InsightError("error: No Valid Sections"));
                    } else { // adding to memory
                        let thisDataSet: Dataset = {id: id, sections: data, };
                        this.datasets.push(thisDataSet);
                        this.idList.push(id);
                    }
                        // saving to disk
                        // used information provided at
                        // stackoverflow.com/questions/42179037/writing-json-object-to-a-json-file-with-fs-writefilesync
                    try { fs.writeFileSync("./data/" + id, JSON.stringify(data));
                    } catch (e) { return Promise.reject(new InsightError("error: unable to write to disk")); }
                    res(this.idList);
                }).catch((error: any) => {
                    return reject(new InsightError("error: not all files are valid"));
                });
            } else if (kind === InsightDatasetKind.Rooms) {
                return reject(new InsightError("error: rooms is currently an invalid kind"));
            }
        });
    }

    // if (kind === InsightDatasetKind.Courses) {
    //     let files: any[] = [];
    //     let zip = new JSZip();
    //     zip.loadAsync(content, {base64: true}).then((zipFile) => {
    //         return zipFile.folder("courses"); }).then((courses) => {
    //         courses.forEach((relativePath, file) => {
    //             files.push(file.async("string"));
    //         });
    //         if (files.length === 0) {
    //             return Promise.reject(new InsightError("error: Empty Folder"));
    //         }
    //     });
    //     Promise.all(files).then((returnedFile) => {
    //         // parse the file for individual sections
    //         let data: Section[] = [];
    //         for (let file of returnedFile) {
    //             const tempSection: Section[] = parseData(file);
    //             if (tempSection.length > 0 && tempSection != null) {
    //                 tempSection.forEach((section) => data.push(section));
    //             }
    //         }
    //         if (data.length === 0) {
    //             return Promise.reject(new InsightError("error: No Valid Sections"));
    //         } else { // adding to memory
    //             let thisDataSet: Dataset = {id: id, sections: data, };
    //             this.datasets.push(thisDataSet);
    //             // saving to disk
    //             // used information provided at
    //             // stackoverflow.com/questions/42179037/writing-json-object-to-a-json-file-with-fs-writefilesync
    //             try {
    //                 fs.writeFileSync("./data/" + id, JSON.stringify(data));
    //             } catch (e) {
    //                 return Promise.reject(new InsightError("error: unable to write to disk"));
    //             }
    //         }
    //     }).catch((error: any) => {
    //         return Promise.reject(new InsightError("error: not all files are valid"));
    //     });
    // }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {

        // Validate the Query. Checking for InsightError
        if (validateQuery(query) === false) {
            return Promise.reject(new InsightError());
        }
        // At this point, the query should be a perfectly valid query (except for NotFoundError and ResultTooLarge)

        return performQueryAfterValidation(query, this.datasets); // Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}

function parseData(file: any): Section[] {
    let returnSectionList: Section[] = [];
    let temp;
    if (!validJSON(file)) {
        return [];
    } else {
        temp = JSON.parse(file);
    }
    let tempSections = temp["result"];
    let currentSection: Section = {
        Section: "",
        Subject: "",
        Course: "",
        Professor: "",
        Title: "",
        id: "",
        Avg: 0,
        Pass: 0,
        Fail: 0,
        Audit: 0,
        Year: 0,
    };
    for (const section of tempSections) {
        currentSection.Subject = section["Subject"];
        currentSection.Course = section["Course"];
        currentSection.Professor = section["Professor"];
        currentSection.Title = section["Title"];
        currentSection.id = section["id"];
        currentSection.Avg = section["Avg"];
        currentSection.Pass = section["Pass"];
        currentSection.Fail = section["Fail"];
        currentSection.Audit = section["Audit"];
        if (section["Section"] === "overall") {
            currentSection.Year = 1900;
        } else {
            currentSection.Year = section["Year"];
        }
        returnSectionList.push(currentSection);
    }
    // used information provided at:
    // https://stackoverflow.com/questions/39308423/how-to-convert-json-object-to-an-typescript-array
    // https://www.cloudhadoop.com/2018/09/how-to-convert-array-to-json-and-json.html
    // https://stackoverflow.com/questions/59749441/parse-array-of-json-objects-to-array-of-typescript-objects
    // OK BASICALLY PARSE THE JSON OBJECTS ONE BY ONE AND THEN ADD THEM TO A SECTION OBJECT
    return returnSectionList;
}
