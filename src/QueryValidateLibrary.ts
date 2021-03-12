/** Validates the given query . true for valid, false for invalid. */
import Log from "./Util";
import {validateColumns, validateOrder, validateStructure, validateTransformation} from "./QueryValidateHelpers";
import {getId} from "./KeyHelpers";

let activeMKeys: string[] = [];
let activeSKeys: string[] = [];
let activeSKeysStringOnly: string[] = [];
const sectionsMKeys: string[] = [ "avg", "pass", "fail", "audit", "year" ];
const sectionsSKeys: string[] = [ "dept", "id", "instructor", "title", "uuid" ];
const sectionsSKeysStringOnly: string[] = ["dept", "instructor", "title"];
const roomsMKeys: string[] = [ "lat", "lon", "seats" ];
const roomsSKeys: string[] = [ "fullname", "shortname", "number", "name", "address", "type", "furniture", "href" ];
const comparatorsAndNegator: string[] = ["LT", "GT", "EQ", "NOT", "IS"];
const comparatorsAll: string[] = ["LT", "GT", "EQ", "NOT", "IS", "AND", "OR"];

export function validateQuery(query: any): boolean {
    // validate overall structure
    if (validateStructure(query) === false) {
        return false;
    }

    // Get dataset id and check it
    let id: string = getId(query);
    if (id.length === 0) {
        return false;
    }

    // SET activeMKeys and activeSKeys
    let randomValidKey: string = query.OPTIONS.COLUMNS[0];
    let randomValidField: string = randomValidKey.substr(randomValidKey.indexOf("_") + 1, randomValidKey.length);
    if (randomValidField.length === 0) {
        return false;
    }
    if (sectionsMKeys.includes(randomValidField) || sectionsSKeys.includes(randomValidField)) {
        activeMKeys = sectionsMKeys;
        activeSKeys = sectionsSKeys;
        activeSKeysStringOnly = sectionsSKeysStringOnly;
    } else if (roomsMKeys.includes(randomValidField) || roomsSKeys.includes(randomValidField)) {
        activeMKeys = roomsMKeys;
        activeSKeys = roomsSKeys;
        activeSKeysStringOnly = roomsSKeys;
    } else {
        return false;
    }
    // validate group and apply and columns and order
    if (validateTransformation(query, id) === false || validateColumns(query, id) === false
        || validateOrder(query, id) === false) {
        return false;
    }
    // Big Recursive Function for Validation
    let retval: boolean =  validateAllKeys(query, id);
    return retval;
}

export function retrieveIdFromKey(key: string): string {
    if (Number.isFinite(Number(key))) {
        return "";
    }
    return key.substr(0, key.indexOf("_"));
}

// input: json object or array of json objects
export function validateAllKeys(json: any, id: string): boolean {
    // Termination: if string or number return true;
    if (Number.isFinite(json) || typeof(json) === "string") {
        return true;
    }
    if (Array.isArray(json) === false) {
        // CASE: json object
        for (let key of Object.keys(json)) {
            if (key === "OPTIONS" || key === "TRANSFORMATIONS") {
                continue;
            }
            let bKeyValid: boolean = validateKeyAndValue(key, json, id); // Check key is valid
            if (bKeyValid) {
                bKeyValid = bKeyValid && validateAllKeys(json[key], id); // Check child keys
            }
            // If either this key or child keys were invalid, break
            if (bKeyValid === false) {
                return false;
            }
        }
        return true;
    } else {
        // CASE: array of json object OR array of string keys
        if (json.length === 0) {
            return true;
        }
        if (typeof json[0] === "string") {
            // array of string keys
            for (let str of json) {
                if (validateMSKeyOnly(str, id) === false) {
                    return false;
                }
            }
            return true;
        } else {
            // array of json objects
            for (let obj of json) {
                if (validateAllKeys(obj, id) === false) {
                    return false;
                }
            }
            return true;
        }
    }
}

// Takes string of key, any of json object, string of dataset id
// checks key is BODY/OPTIONS or COMPARISON/NEGATION or KEY
// if COMPARISON/NEGATION, return true if value is not string and not number
// if KEY, return true if value is string when SKEY and if value is number when MKEY
// if neither, return false
export function validateKeyAndValue(key: string, json: any, id: string): boolean {
    if (key === "WHERE" || key === "OPTIONS" || key === "COLUMNS" || key === "ORDER") {
        return true;
    }
    // match string to comparison/negation first, if no match, then check if key
    if (key === "AND" || key === "OR") {
        // value better be an array of json objects
        if (Array.isArray(json[key])) {
            if (json[key].length > 0) {
                let valueInArray = json[key][0];
                return Array.isArray(valueInArray) === false && Number.isFinite(valueInArray) === false
                    && typeof(valueInArray) !== "string";
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
    // LT GT EQ IS NOT
    if (comparatorsAndNegator.includes(key)) {
        return helperValidateMSComparisonAndNegation(key, json, id);
    }
    // If id portion of key doesn't match our id, return false
    if (retrieveIdFromKey(key) !== id) {
        return false;
    }
    // Trim off the id
    let field: string = key.substr(key.indexOf("_") + 1, key.length);
    if (field.length === 0) {
        return false;
    }
    // SKEY, MKEY check
    if (activeMKeys.includes(field)) {
        // value better be a valid number
        return Number.isFinite(json[key]);
    }
    if (activeSKeys.includes(field)) {
        // value better be a valid string, e.g. look for asterisks rules and shit
        if (typeof json[key] === "string") {
            if (activeSKeysStringOnly.includes(field)) {
                // Asterisk Check
                if (json[key].length > 2) {
                    let asteriskCheck: string = json[key].substr(1, json[key].length - 2);
                    if (asteriskCheck.includes("*")) {
                        return false;
                    }
                }
                return true;
            } else {
                // check if can convert to number
                let numcheck: number = Number(json[key]);
                return Number.isInteger(numcheck);
            }
        } else {
            return false;
        }
    }
    // If none of the above, invalid.
    return false;
}

// Checks LT GT EQ IS NOT
function helperValidateMSComparisonAndNegation(key: string, json: any, id: string): boolean {
    // value better be a json object and not a string and not a number
    let value = json[key];
    if (Object.keys(value).length === 0 || Object.keys(value).length > 1) {
        return false;
    }
    if (key === "IS") {
        for (let childKey of Object.keys(value)) {
            if (validateSKeyOnly(childKey, id) === false) {
                return false;
            }
        }
    }
    if (key === "LT" || key === "GT" || key === "EQ") {
        for (let childKey of Object.keys(value)) {
            if (validateMKeyOnly(childKey, id) === false) {
                return false;
            }
        }
    }
    if (key === "NOT") {
        for (let childKey of Object.keys(value)) {
            if ((comparatorsAll.includes(childKey)) === false) {
                return false;
            }
        }
    }
    return Array.isArray(value) === false && Number.isFinite(value) === false && typeof(value) !== "string";
}

// Returns true if key is a valid mkey or skey based on given id
export function validateMSKeyOnly(key: string, id: string): boolean {
    return validateMKeyOnly(key, id) || validateSKeyOnly(key, id);
}

// Returns true if key is a valid mkey based on the given id
export function validateMKeyOnly(key: string, id: string): boolean {
    // If id portion of key doesn't match our id, return false
    if (retrieveIdFromKey(key) !== id) {
        return false;
    }
    // Trim off the id
    let field: string = key.substr(key.indexOf("_") + 1, key.length);
    if (field.length === 0) {
        return false;
    }
    // MKEY check
    if (activeMKeys.includes(field)) {
        return true;
    }
    return false;
}

// Returns true if key is a valid skey based on the given id
export function validateSKeyOnly(key: string, id: string): boolean {
    if (retrieveIdFromKey(key) !== id) {
        return false;
    }
    let field: string = key.substr(key.indexOf("_") + 1, key.length);
    if (field.length === 0) {
        return false;
    }
    // SKEY check
    if (activeSKeys.includes(field)) {
        return true;
    }
    return false;
}
