import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

import * as dataSetHelpers from "../dataSetHelpers";
import {existingDataSetID, validateDataSetKind} from "../dataSetHelpers";
import {addCourseDataset, addRoomDataset} from "../AddDataSetLibrary";

import {validateQuery} from "../QueryValidateLibrary";
import {performQueryAfterValidation} from "../QueryPerformLibrary";
// import * as JSZip from "jszip";
import * as fs from "fs";
import {getId} from "../KeyHelpers";

// Represents a dataset
export interface Dataset {
    // dataset id so we can pick this dataset when querying
    id: string;
    // array including all sections within this dataset
    sections: Section[];
    // array for the rooms present in this dataset
    rooms: Room[];
    // kind determines whether sections or rooms is populated (i.e. does this dataset hold sections or rooms)
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

export interface Room {
    fullname:   string; // e.g. Hugh Dempster Pavilion
    shortname:  string; // e.g. DMP
    number:     string; // not always a number so string
    name:       string; // room id; shortname + "_" + number
    address:    string; // e.g. "6245 Agronomy Road V6T 1Z4"
    lat:        number; // latitude of the building, as received via HTTP request
    long:       number; // longitude of the building, as received via HTTP request
    seats:      number; // The number of seats in the room. Should this value be missing in the dataset, default to 0
    type:       string; // The room type (e.g., "Small Group").
    furniture:  string; // The room furniture (e.g., "Classroom-Movable Tables & Chairs").
    href:       string; // e.g. "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201"
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
            return addRoomDataset(id, content, this.idList, this.insightDatasets, this.datasets);
        }
    }

    // used information provided at:
    // https://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array/38516944
    public removeDataset(id: string): Promise<string> {
        if (dataSetHelpers.validDataSetID(id) === false) {
            return Promise.reject(new InsightError("error: Invalid DataSet ID"));
        }
        if (existingDataSetID(id, this.idList) === false) { // check idList first, if not in idList do another check
            let noID: boolean = true;
            for (let dataset of this.datasets) {
                if (dataset.id === id) {
                    noID = false;
                }
            }
            if (noID === true) {
                return Promise.reject(new NotFoundError("error: no existing dataSet with this ID"));
            }
        }
        return new Promise<string>((res, reject) => {
            if (this.datasets.length !== 0 && this.insightDatasets.length !== 0 && this.idList.length !== 0) {
                // buildings.forEach((build) => promises.push(zip.file("rooms" + build.href.substr(1)).async("text")));
                for (let i = 0; i < this.datasets.length; i++) {
                    if (this.datasets[i].id === id) {
                        this.datasets.splice(i, 1);
                        break;
                    }
                }
                for (let i = 0; i < this.idList.length; i++) {
                    if (this.idList[i] === id) {
                        this.idList.splice(i, 1);
                        break;
                    }
                }
                for (let i = 0; i < this.insightDatasets.length; i++) {
                    if (this.insightDatasets[i].id === id) {
                        this.idList.splice(i, 1);
                        break;
                    }
                }
            } else if (this.datasets.length === 0) {
                return reject(new InsightError("error: currently no datasets in memory"));
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
        let datasetId: string = getId(query);
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

            let thisDataSet: Dataset;
            let fromDisk = JSON.parse(data);
            let randomValidKey: string = query.OPTIONS.COLUMNS[0];
            let randomValidField: string = randomValidKey.substr(randomValidKey.indexOf("_") + 1,
                randomValidKey.length);
            const sectionsMKeys: string[] = [ "avg", "pass", "fail", "audit", "year" ];
            const sectionsSKeys: string[] = [ "dept", "id", "instructor", "title", "uuid" ];
            const roomsMKeys: string[] = [ "lat", "lon", "seats" ];
            const roomsSKeys: string[] =
                [ "fullname", "shortname", "number", "name", "address", "type", "furniture", "href" ];
            if (sectionsMKeys.includes(randomValidField) || sectionsSKeys.includes(randomValidField)) {
                thisDataSet = {id: datasetId, sections: fromDisk, rooms: [],
                    kind: InsightDatasetKind.Courses };
            } else if (roomsMKeys.includes(randomValidField) || roomsSKeys.includes(randomValidField)) {
                thisDataSet = {id: datasetId, sections: [], rooms: fromDisk,
                    kind: InsightDatasetKind.Rooms };
            }
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
