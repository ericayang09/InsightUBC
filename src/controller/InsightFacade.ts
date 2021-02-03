import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";

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
    public datasets: Dataset[];

    public addDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {

        /*

        let obj be a new Section with uninitialized values.
        then initialize values of obj that are requested by the Query (e.g. what's in COLUMNS).
        then JSON.stringify( obj ) will stringify only those values that are initialized
        i just need to figure out how to change the order of elements in the json string
        Order of the keys in each item of the returned array is same as order of the keys in COLUMNS.

        Query ORDER is to order items in the returned array in ascending order.
        - What order if ORDER is empty in query?

        - order is in ascending order of numbers if ORDER is a number type
        - order is in alphabetical order if ORDER is string type.
            - what if two items are tied? e.g. order by alphabetical but both values are "CPSC". what order then?

        * */
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}
