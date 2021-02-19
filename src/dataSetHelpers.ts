import {InsightDatasetKind, InsightError, } from "./controller/IInsightFacade";
import {Dataset, } from "./controller/InsightFacade";
import * as fs from "fs";

export function validDataSetID(key: string): boolean {
    if (key == null ||                          // string != null
        !key ||                                 // string not undefined
        key.trim().length === 0 ||              // cannot be all whitespaces
        key.includes("_")) {                // cannot contain underscore
        return false;
    } else {
        return true;
    }
}

export function existingDataSetID(key: string, dataset: Dataset[]): boolean {
    for (let data of dataset) {
        if (data.id === key) {
            return true;
            break;
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
