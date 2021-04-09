import {Dataset, Section} from "./controller/InsightFacade";
import {InsightDatasetKind, InsightError, ResultTooLargeError} from "./controller/IInsightFacade";
import {retrieveIdFromKey} from "./QueryValidateLibrary";
import {getDataStringKey, getId} from "./KeyHelpers";
import apply = Reflect.apply;
import {
    doApplyIdontcare,
    doGroupsIdontcare,
    getMatchingSectionsOrRoomsRaw,
    sortWithSortRule
} from "./QueryPerformHelpers";

// Enum to represent keys
enum Keys {
    dept = "Subject",
    id = "Course",
    instructor = "Professor",
    title = "Title",
    uuid = "id",
    avg = "Avg",
    pass = "Pass",
    fail = "Fail",
    audit = "Audit",
    year = "Year",

    fullname = "fullname",
    shortname = "shortname",
    number= "number",
    name = "name",
    address = "address",
    lat = "lat",
    lon = "lon",
    seats = "seats",
    type = "type",
    furniture = "furniture",
    href = "href"
}

export interface SortRule {
    direction: string;
    keys: string[];
}

export function performQueryAfterValidation(query: any, datasets: Dataset[]): Promise<any[]> {
    let datasetId: string = getId(query); // Get dataset id and check it
    let dataset: Dataset // Get dataset we want to query
        = { id: "", sections: [], rooms: [], kind: InsightDatasetKind.Courses}; // Dataset with the id we are querying
    let i;
    for (i = 0; i < datasets.length; ++i) {
        if (datasets[i].id === datasetId) {
            dataset = datasets[i];
        }
    }
    if (dataset.id.length <= 0) { // Check that dataset id is not empty at this point
        return Promise.reject(new InsightError());
    }
    let sortRule: SortRule = { direction: "UP", keys: [] };
    if ("ORDER" in query.OPTIONS) {
        if (typeof(query.OPTIONS.ORDER) === "string") {
            sortRule.keys.push(query.OPTIONS.ORDER);
        } else {
            sortRule.direction = query.OPTIONS.ORDER.dir;
            for (let k of query.OPTIONS.ORDER.keys) {
                sortRule.keys.push(k);
            }
        }
    }
    let keysToReturn: Keys[] = [];
    // Find out which key/fields we want to return
    for (i = 0; i < query.OPTIONS.COLUMNS.length; ++i) {
        let keyString: string = query.OPTIONS.COLUMNS[i];
        keyString = keyString.substr(keyString.indexOf("_") + 1, keyString.length); // Grabs the part after id
        let keyEnum: Keys = (Keys as any)[keyString];
        keysToReturn.push(keyEnum);
    }
    let dataArrayRaw: any[] = getMatchingSectionsOrRoomsRaw(dataset, query); // Get all the matching data first
    if (dataArrayRaw.length > 5000) {
        return Promise.reject(new ResultTooLargeError()); // Result too great error
    }
    if (query.TRANSFORMATIONS !== undefined) {
        let groupDictionary: any = doGroupsIdontcare(query.TRANSFORMATIONS.GROUP, dataArrayRaw); // put into groups
        let arrayOfTransformedObjs: any[] = doApplyIdontcare(groupDictionary, query.TRANSFORMATIONS.APPLY, query);
        // sort
        let sortedArray: any[] = sortWithSortRule(sortRule, arrayOfTransformedObjs);
        return Promise.resolve(sortedArray);
    } else {
        let retArray: any[] = [];
        for (let d of dataArrayRaw) {
            let retSection: any = getSectionObjectToReturn(datasetId, d, keysToReturn);
            retArray.push(retSection);
        }
        retArray = sortWithSortRule(sortRule, retArray);
        return Promise.resolve(retArray);
    }
}

// Helper to get section object with relevant keys
function getSectionObjectToReturn(datasetId: string, section: any, keysToReturn: Keys[]): any {
    let retSec: any = {};
    for (const keyEnum of keysToReturn) { // Populate retSection with relevant info to return
        let retVal = section[keyEnum];
        let retKey = datasetId;
        switch (keyEnum) {
            case Keys.dept: {
                retKey += "_dept";
                break;
            }
            case Keys.id: {
                retKey += "_id";
                break;
            }
            case Keys.instructor: {
                retKey += "_instructor";
                break;
            }

            case Keys.uuid: {
                retKey += "_uuid";
                break;
            }
            case Keys.avg: {
                retKey += "_avg";
                break;
            }
            case Keys.audit: {
                retKey += "_audit";
                break;
            }
            default: {
                retKey += "_" + keyEnum.toLowerCase();
            }
        }
        retSec[retKey] = keyEnum === Keys.uuid ? retVal.toString() : (keyEnum === Keys.year ? Number(retVal) : retVal);
    }
    return retSec;
}

// Inserts given section return data to the return array in the correct order
function insertSectionToReturnArray(section: any, retArray: any[], orderKey: string): any[] {
    if (orderKey !== "") {
        let i;
        for (i = 0; i < retArray.length; ++i) {
            let sec: any = retArray[i];
            if (section[orderKey] < sec[orderKey]) {
                retArray.splice(i, 0, section);
                return retArray;
            }
        }
        retArray.push(section);
    } else {
        retArray.push(section);
    }

    return retArray;
}

// ----------------------- shouldAdd and helpers ---------------------------

// should add function returns boolean - just check if a given section matches the WHERE of query
export function shouldAdd(where: any, sectionOrRoom: any): boolean {
    if (Object.keys(where).length <= 0) {
        return true; // If where is empty
    }
    return shouldAddHelper(where, sectionOrRoom);
}

function shouldAddHelper(queryObj: any, sectionOrRoom: any): boolean {
    let key: any = Object.keys(queryObj)[0];
    let val: any = queryObj[key];

    switch (key) {
        case "IS": {
            return queryISHelper(val, sectionOrRoom);
        }
        case "NOT": {
            return !shouldAddHelper(val, sectionOrRoom); // Negate whether it was a match
        }
        case "LT": {
            return queryLTHelper(val, sectionOrRoom);
        }
        case "GT": {
            return queryGTHelper(val, sectionOrRoom);
        }
        case "EQ": {
            return queryEQHelper(val, sectionOrRoom);
        }
        case "AND": {
            return queryANDHelper(val, sectionOrRoom);
        }
        case "OR": {
            return queryORHelper(val, sectionOrRoom);
        }
    }

    return true;
}

function queryISHelper(val: any, section: any): boolean {
    let fullKeyString: string = Object.keys(val)[0];
    let keyString = fullKeyString.substr(fullKeyString.indexOf("_") + 1, fullKeyString.length);
    let keyEnum: Keys = (Keys as any)[keyString];
    let compareVal: string = val[fullKeyString];
    let sectionVal: number|string = section[keyEnum];

    let sectionValStr: string = sectionVal.toString();

    // keep in mind asterisk. if asterisk at start, then start doesn't matter. if at end, end doesn't matter.
    let hasAsteriskStart = compareVal.charAt(0) === "*";
    let hasAsteriskEnd = compareVal.charAt(compareVal.length - 1) === "*";
    if (hasAsteriskStart && hasAsteriskEnd) { // at both start and end
        compareVal = compareVal.substr(1, compareVal.length - 2);
        return sectionValStr.includes(compareVal);
    }
    if (hasAsteriskStart) { // only at start
        compareVal = compareVal.substr(1, compareVal.length - 1);
        sectionValStr = sectionValStr.substr(sectionValStr.length - compareVal.length, compareVal.length);
        return sectionValStr === compareVal;
    }
    if (hasAsteriskEnd) { // only at end
        compareVal = compareVal.substr(0, compareVal.length - 1);
        sectionValStr = sectionValStr.substr(0, compareVal.length);
        return sectionValStr === compareVal;
    }

    return sectionValStr === compareVal;
}

function queryLTHelper(val: any, section: any): boolean {
    let fullKeyString: string = Object.keys(val)[0];
    let keyString = fullKeyString.substr(fullKeyString.indexOf("_") + 1, fullKeyString.length);
    let keyEnum: Keys = (Keys as any)[keyString];
    let compareVal: number|string = val[fullKeyString];
    let sectionVal: number|string = section[keyEnum];

    return compareVal > sectionVal;
}

function queryGTHelper(val: any, section: any): boolean {
    // terminate
    let fullKeyString: string = Object.keys(val)[0];
    let keyString = fullKeyString.substr(fullKeyString.indexOf("_") + 1, fullKeyString.length);
    let keyEnum: Keys = (Keys as any)[keyString];
    let compareVal: number|string = val[fullKeyString];
    let sectionVal: number|string = section[keyEnum];

    return compareVal < sectionVal;
}

function queryEQHelper(val: any, section: any): boolean {
    // terminate
    let fullKeyString: string = Object.keys(val)[0];
    let keyString = fullKeyString.substr(fullKeyString.indexOf("_") + 1, fullKeyString.length);
    let keyEnum: Keys = (Keys as any)[keyString];
    let compareVal: number|string = val[fullKeyString];
    let sectionVal: number|string = section[keyEnum];

    return compareVal.toString() === sectionVal.toString();
}

function queryANDHelper(array: any, section: any): boolean {
    // for each object of array, run shouldAddHelper
    // then && them all together. or use bitwise and
    let i;
    for (i = 0; i < array.length; ++i) {
        if (shouldAddHelper(array[i], section) === false) {
            return false; // return false if one of the child queries is false
        }
    }
    return true;
}

function queryORHelper(array: any, section: any): boolean {
    let i;
    for (i = 0; i < array.length; ++i) {
        if (shouldAddHelper(array[i], section)) {
            return true; // return true if one of the child queries is true
        }
    }
    return false;
}

// ----------------------------------------------------------------------------------
