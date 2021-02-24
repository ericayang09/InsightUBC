import {Dataset, Section} from "./controller/InsightFacade";
import {InsightDatasetKind, InsightError, ResultTooLargeError} from "./controller/IInsightFacade";

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
    year = "Year"
}

export function performQueryAfterValidation(query: any, datasets: Dataset[]): Promise<any[]> {
    let firstKeyInColumns: string = query.OPTIONS.COLUMNS[0];
    let datasetId: string = firstKeyInColumns.substr(0, firstKeyInColumns.indexOf("_"));

    // Get dataset we want to query
    let dataset: Dataset
        = { id: "", sections: [], kind: InsightDatasetKind.Courses}; // Dataset with the id we are querying
    let i;
    for (i = 0; i < datasets.length; ++i) {
        if (datasets[i].id === datasetId) {
            dataset = datasets[i];
        }
    }

    // Check that dataset id is not empty at this point
    if (dataset.id.length <= 0) {
        return Promise.reject(new InsightError());
    }

    let orderKey: string = "";
    // Find out the order key if ORDER exists
    if ("ORDER" in query.OPTIONS) {
        orderKey = query.OPTIONS.ORDER;
    }

    let keysToReturn: Keys[] = [];
    // Find out which key/fields we want to return
    for (i = 0; i < query.OPTIONS.COLUMNS.length; ++i) {
        let keyString: string = query.OPTIONS.COLUMNS[i];
        keyString = keyString.substr(keyString.indexOf("_") + 1, keyString.length); // Grabs the part after id
        let keyEnum: Keys = (Keys as any)[keyString];
        keysToReturn.push(keyEnum);
    }

    let retArray: any[] = [];
    // Find all the sections that match the query
    for (i = 0; i < dataset.sections.length; ++i) {
        let where: any = query.WHERE;
        let section: Section = dataset.sections[i];

        // if shouldAdd === true, then add the necessary data to the return array.
        if (shouldAdd(where, section)) {
            let retSection: any = getSectionObjectToReturn(datasetId, section, keysToReturn);
            retArray = insertSectionToReturnArray(retSection, retArray, orderKey);
            // Result too great error
            if (retArray.length > 5000) {
                return Promise.reject(new ResultTooLargeError());
            }
        }
    }

    return Promise.resolve(retArray);
}

// Helper to get section object with relevant keys
function getSectionObjectToReturn(datasetId: string, section: Section, keysToReturn: Keys[]): any {
    let retSection: any = {};
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
            case Keys.title: {
                retKey += "_title";
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
            case Keys.pass: {
                retKey += "_pass";
                break;
            }
            case Keys.fail: {
                retKey += "_fail";
                break;
            }
            case Keys.audit: {
                retKey += "_audit";
                break;
            }
            case Keys.year: {
                retKey += "_year";
                break;
            }
        }
        retSection[retKey] = retVal;
    }
    return retSection;
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
function shouldAdd(where: any, section: Section): boolean {
    // If where is empty
    if (Object.keys(where).length <= 0) {
        return true;
    }

    return shouldAddHelper(where, section);
}

function shouldAddHelper(queryObj: any, section: Section): boolean {
    let key: any = Object.keys(queryObj)[0];
    let val: any = queryObj[key];

    switch (key) {
        case "IS": {
            return queryISHelper(val, section);
        }
        case "NOT": {
            return !shouldAddHelper(val, section); // Negate whether it was a match
        }
        case "LT": {
            return queryLTHelper(val, section);
        }
        case "GT": {
            return queryGTHelper(val, section);
        }
        case "EQ": {
            return queryEQHelper(val, section);
        }
        case "AND": {
            return queryANDHelper(val, section);
        }
        case "OR": {
            return queryORHelper(val, section);
        }
    }

    return true;
}

function queryISHelper(val: any, section: Section): boolean {
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
        sectionValStr = sectionValStr.substr(sectionValStr.length - compareVal.length + 1, compareVal.length);
        return sectionValStr === compareVal;
    }
    if (hasAsteriskEnd) { // only at end
        compareVal = compareVal.substr(0, compareVal.length - 1);
        sectionValStr = sectionValStr.substr(0, compareVal.length);
        return sectionValStr === compareVal;
    }

    return sectionValStr === compareVal;
}

function queryLTHelper(val: any, section: Section): boolean {
    let fullKeyString: string = Object.keys(val)[0];
    let keyString = fullKeyString.substr(fullKeyString.indexOf("_") + 1, fullKeyString.length);
    let keyEnum: Keys = (Keys as any)[keyString];
    let compareVal: number|string = val[fullKeyString];
    let sectionVal: number|string = section[keyEnum];

    return compareVal > sectionVal;
}

function queryGTHelper(val: any, section: Section): boolean {
    // terminate
    let fullKeyString: string = Object.keys(val)[0];
    let keyString = fullKeyString.substr(fullKeyString.indexOf("_") + 1, fullKeyString.length);
    let keyEnum: Keys = (Keys as any)[keyString];
    let compareVal: number|string = val[fullKeyString];
    let sectionVal: number|string = section[keyEnum];

    return compareVal < sectionVal;
}

function queryEQHelper(val: any, section: Section): boolean {
    // terminate
    let fullKeyString: string = Object.keys(val)[0];
    let keyString = fullKeyString.substr(fullKeyString.indexOf("_") + 1, fullKeyString.length);
    let keyEnum: Keys = (Keys as any)[keyString];
    let compareVal: number|string = val[fullKeyString];
    let sectionVal: number|string = section[keyEnum];

    return compareVal === sectionVal;
}

function queryANDHelper(array: any, section: Section): boolean {
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

function queryORHelper(array: any, section: Section): boolean {
    let i;
    for (i = 0; i < array.length; ++i) {
        if (shouldAddHelper(array[i], section)) {
            return true; // return true if one of the child queries is true
        }
    }
    return false;
}

// ----------------------------------------------------------------------------------
