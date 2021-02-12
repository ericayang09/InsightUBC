import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";

import { validateQuery } from "../QueryValidateLibrary";
import { performQueryAfterValidation } from "../QueryPerformLibrary";

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

        this.datasets = [];
        // need fake dataset + sections to test
        let temp1: Section = { Section : "", Subject : "", Course : "201", Professor : "Baniassad, Elisa",
            Title: "feafea", id: "100",
            Avg: 91, Pass: 80, Fail: 10, Audit: 10, Year: 10 };
        let temp2: Section = { Section : "", Subject : "", Course : "410", Professor : "Gregor Kiczales",
            Title: "feafea", id: "101",
            Avg: 80, Pass: 50, Fail: 10, Audit: 10, Year: 10 };
        let temp3: Section = { Section : "", Subject : "", Course : "600", Professor : "Something",
            Title: "feafea", id: "102",
            Avg: 60, Pass: 20, Fail: 10, Audit: 10, Year: 10 };
        let temp4: Section = { Section : "", Subject : "math", Course : "201", Professor : "feafpeao",
            Title: "afea", id: "103",
            Avg: 99.78, Pass: 10, Fail: 10, Audit: 10, Year: 10 };
        let temp5: Section = { Section : "", Subject : "math", Course : "300", Professor : "feafafa",
            Title: "faefa", id: "104",
            Avg: 99.78, Pass: 10, Fail: 10, Audit: 10, Year: 10 };
        let temp6: Section = { Section : "", Subject : "cnps", Course : "400", Professor : "feafeafa",
            Title: "afeafa", id: "105",
            Avg: 99.19, Pass: 10, Fail: 10, Audit: 10, Year: 10 };
        let dataset: Dataset = { id: "courses", sections: [temp1, temp2, temp3, temp4, temp5, temp6]};
        // add fake dataset
        this.datasets.push(dataset);

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
