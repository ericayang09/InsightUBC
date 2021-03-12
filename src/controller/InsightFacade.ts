import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

import * as dataSetHelpers from "../dataSetHelpers";
import {existingDataSetID, validateDataSetKind, validJSON} from "../dataSetHelpers";
import {addCourseDataset} from "../AddDataSetLibrary";

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
            return Promise.reject(new InsightError("error: Invalid DataSet ID"));
        }
        if (existingDataSetID(id, this.idList)) {
            return Promise.reject(new InsightError("error: Pre-existing DataSet with this ID"));
        }
        if (!validateDataSetKind(kind)) {
            return Promise.reject(new InsightError("error: Invalid Dataset Kind"));
        }
        try {
            if (!fs.existsSync("./data")) {
                fs.mkdirSync("./data");
            }
        } catch (e) {
            return Promise.reject(new InsightError("error: unable to add data folder to disk"));
        }
        if (kind === InsightDatasetKind.Courses) {
            return addCourseDataset(id, content, this.idList, this.insightDatasets, this.datasets);
        } else if (kind === InsightDatasetKind.Rooms) {
            return Promise.reject(new InsightError("error: rooms is currently an invalid kind"));
        }
    }

    // used information provided at:
    // https://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array/38516944
    public removeDataset(id: string): Promise<string> {
        if (!dataSetHelpers.validDataSetID(id)) {
            return Promise.reject(new InsightError("error: Invalid DataSet ID"));
        }
        if (!existingDataSetID(id, this.idList)) { // check idList first, if not in idList do another check
            let noID: boolean = true;
            for (let dataset of this.datasets) {
                if (dataset.id === id) {
                    noID = false;
                }
                if (noID === true) {
                    return Promise.reject(new NotFoundError("error: no existing dataSet with this ID"));
                }
            }
            return new Promise<string>((res, reject) => {
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
    }

    public performQuery(query: any): Promise<any[]> {
        // Validate the Query. Checking for InsightError
        if (validateQuery(query) === false || this.checkDatasetExists(query) === false) {
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

    // checks if dataset exists in Datasets. if not, checks disk.
    public checkDatasetExists(query: any): boolean {
        let firstKeyInColumns: string = query.OPTIONS.COLUMNS[0];
        let datasetId: string = firstKeyInColumns.substr(0, firstKeyInColumns.indexOf("_"));
        // Validate id exists in added datasets
        for (let dsetid of this.idList) {
            if (dsetid === datasetId) {
                return true;
            }
        }
        // at this point, dataset doesn't exist in memory
        fs.readFile("./data/" + datasetId, "utf-8", (err, data) => {
            if (err) {
                return false;
            }

            let fromDisk = JSON.parse(data);
            let thisDataSet: Dataset = {id: datasetId, sections: fromDisk, kind: InsightDatasetKind.Courses };
            this.datasets.push(thisDataSet);
            this.idList.push(datasetId);
        });

        return false;
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise((resolve) => {
            resolve(this.insightDatasets);
        });
    }
}
