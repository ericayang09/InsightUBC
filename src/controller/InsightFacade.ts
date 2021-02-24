import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

import * as dataSetHelpers from "../dataSetHelpers";
import {existingDataSetID, validateDataSetKind, validJSON} from "../dataSetHelpers";

import {validateQuery} from "../QueryValidateLibrary";
import {performQueryAfterValidation} from "../QueryPerformLibrary";
import * as JSZip from "jszip";
import * as fs from "fs";
// import {NotFoundError} from "restify";

// Represents a dataset
export interface Dataset {
    // dataset id so we can pick this dataset when querying
    id: string;
    // array including all sections within this dataset
    sections: Section[];
    kind: InsightDatasetKind;
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
    public insightDatasets: InsightDataset[] = [];
    // AddDataset
    public addDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<string[]> {
        if (!dataSetHelpers.validDataSetID(id)) {
            return Promise.reject(new InsightError("error: Invalid DataSet ID")); }
        if (existingDataSetID(id, this.idList)) {
            return Promise.reject(new InsightError("error: Pre-existing DataSet with this ID")); }
        if (!validateDataSetKind(kind)) {
            return Promise.reject(new InsightError("error: Invalid Dataset Kind")); }
        try {
            if (!fs.existsSync("./data")) { fs.mkdirSync("./data"); }
        } catch (e) {
            return Promise.reject(new InsightError("error: unable to add file to disk"));
        }
        return new Promise<string[]>((res, reject) => {
        if (kind === InsightDatasetKind.Courses) {
                let files: any[] = [];
                let zip = new JSZip();
                zip.loadAsync(content, {base64: true}).then((zipFile) => {
                    zipFile.folder("courses").forEach((relativePath, file) => {
                        files.push(file.async("string")); });
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
                        } }
                    if (data.length === 0) {
                        return reject(new InsightError("error: No Valid Sections"));
                    } else { // adding to memory
                        let thisDataSet: Dataset = {id: id, sections: data, kind: InsightDatasetKind.Courses};
                        const insightDataset: InsightDataset
                            = {id: id, kind: InsightDatasetKind.Courses, numRows: data.length};
                        this.insightDatasets.push(insightDataset);
                        this.datasets.push(thisDataSet);
                        this.idList.push(id); }
                        // saving to disk
                        // used information provided at
                        // stackoverflow.com/questions/42179037/writing-json-object-to-a-json-file-with-fs-writefilesync
                    try { fs.writeFileSync("./data/" + id, JSON.stringify(data));
                    } catch (e) { return reject(new InsightError("error: unable to write to disk")); }
                    res(this.idList);
                }).catch((error: any) => {
                    return reject(new InsightError("error: not all files are valid"));
                });
            } else if (kind === InsightDatasetKind.Rooms) {
                return reject(new InsightError("error: rooms is currently an invalid kind"));
            }
        });
    }

    public removeDataset(id: string): Promise<string> {
        if (!dataSetHelpers.validDataSetID(id)) {
            return Promise.reject(new InsightError("error: Invalid DataSet ID")); }
        if (!existingDataSetID(id, this.idList)) { // check idList first, if not in idList do another check
            let noID: boolean = true;
            for (let dataset of this.datasets) {
                if (dataset.id === id) {
                    noID = false; }
            }
            if (noID === true) {
                return Promise.reject(new NotFoundError("error: no existing dataSet with this ID"));
            }
        }
        return new Promise<string>((res, reject) => {
            // used information provided at:
            // https://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array/38516944
            if (this.datasets.length !== 0) {
                let indexOfDataset;
                indexOfDataset = this.datasets.findIndex((oneDataset) => oneDataset.id === id);
                if (indexOfDataset >= 0) {
                    try {
                        this.datasets.splice(indexOfDataset, 1);
                    } catch (err) {
                        return reject(new InsightError("error: unable to remove dataset from memory"));
                    }
                }
            } else if (this.datasets.length === 0) {
                return reject(new InsightError("error: currently no datasets in memory"));
            }
            if (this.idList.length !== 0) {
                let indexOfID;
                indexOfID = this.idList.indexOf(id);
                if (indexOfID >= 0) {
                    try {
                        this.idList.splice(indexOfID, 1);
                    } catch (err) {
                        return reject(new InsightError("error: unable to remove id from idList"));
                    }
                }
            }
            if (fs.existsSync("./data")) {
                try {
                    fs.unlinkSync("./data/" + id);
                } catch (e) {
                    return reject(new InsightError("error: unable to remove dataset from disk"));
                }
            } else {
                return reject(new InsightError("error: currently no 'data' folder on disk"));
            }
            res(id);
        });
    }

    public performQuery(query: any): Promise<any[]> {

        // Validate the Query. Checking for InsightError
        if (validateQuery(query) === false) {
            return Promise.reject(new InsightError());
        }
        // At this point, the query should be a perfectly valid query (except for NotFoundError and ResultTooLarge)

        return performQueryAfterValidation(query, this.datasets); // Promise.reject("Not implemented.");
    }
    /**
     * List all currently added datasets, their types, and number of rows.
     *
     * @return Promise <InsightDataset[]>
     * The promise should fulfill an array of currently added InsightDatasets, and will only fulfill.
     */

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise((resolve) => {
            resolve(this.insightDatasets);
        });
        // let insightDatasetList: InsightDataset[] = [];
        // return new Promise<InsightDataset[]> ((resolve) => {
        //     if (this.datasets.length === 0) {
        //         return insightDatasetList;
        //     }
        //     try {
        //         for (const oneDataset of this.datasets) {
        //             const oneInsightDataset: InsightDataset = {id: "", kind: InsightDatasetKind.Courses, numRows: 0};
        //             oneInsightDataset.id = oneDataset.id;
        //             oneInsightDataset.kind = oneDataset.kind;
        //             oneInsightDataset.numRows = oneDataset.sections.length;
        //             insightDatasetList.push(oneInsightDataset);
        //         }
        //     } catch (e) {
        //         return e;
        //     }
        //     return insightDatasetList;
        // });
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
    for (const section of tempSections) {
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
