/** Validates the given query . true for valid, false for invalid. */
import Log from "./Util";

export function validateQuery(query: any): boolean {
    // Check WHERE exists
    if (query.WHERE === undefined) {
        return false;
    }
    // Check if WHERE has more than 0 or 1 keys
    if (Object.keys(query.WHERE).length !== 0 && Object.keys(query.WHERE).length !== 1) {
        return false;
    }
    // Check OPTIONS exists
    if (query.OPTIONS === undefined) {
        return false;
    }
    // Check COLUMNS exists
    if (query.OPTIONS.COLUMNS === undefined) {
        return false;
    }
    // Check COLUMNS isn't empty
    if (query.OPTIONS.COLUMNS.length <= 0) {
        return false;
    }
    // Get dataset id and check it
    let id: string = retrieveIdFromKey(query.OPTIONS.COLUMNS[0]);
    if (id.length === 0) {
        return false;
    }
    // Check keys inside COLUMNS are valid
    for (let key of query.OPTIONS.COLUMNS) {
        if (validateMSKeyOnly(key, id) === false) {
            return false;
        }
    }
    // Check if OPTIONS has more than 2 keys
    if (Object.keys(query.OPTIONS).length > 2) {
        return false;
    }
    // Check if OPTIONS has 2 keys but one of them isn't ORDER
    if (Object.keys(query.OPTIONS).length === 2 && "ORDER" in query.OPTIONS === false) {
        return false;
    }
    // Check if order exists, it isn't an empty value
    if ("ORDER" in query.OPTIONS && query.OPTIONS.ORDER === undefined) {
        return false;
    }
    // If ORDER exists, check value(which is a key) of ORDER is valid
    if ("ORDER" in query.OPTIONS && (typeof(query.OPTIONS.ORDER) !== "string"
        || validateMSKeyOnly(query.OPTIONS.ORDER, id) === false)) {
        return false;
    }
    // If ORDER exists, the ORDER key must exist in COLUMNS array
    if ("ORDER" in query.OPTIONS && query.OPTIONS.COLUMNS.includes(query.OPTIONS.ORDER) === false) {
        return false;
    }

    // Validate id exists in added datasets
    // for (let dset of this.datasets) {
    //     if (dset.id === id) {
    //         break;
    //     }
    //     return false;
    // }

    // Big Recursive Function for Validation
    return validateAllKeys(query, id);
}

export function retrieveIdFromKey(key: string): string {
    return key.substr(0, key.indexOf("_"));
}

// input: json object or array of json objects
export function validateAllKeys(json: any, id: string): boolean {
    // Termination: if string or number return true;
    if (Number.isFinite(json) || typeof(json) === "string") {
        return true;
    }
    // Log.info(json);
    if (Array.isArray(json) === false) {
        // CASE: json object
        for (let key of Object.keys(json)) {
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
                return true;
            }
        } else {
            return false;
        }
    }
    // LT GT EQ IS NOT
    if (key === "LT" || key === "GT" || key === "EQ" || key === "NOT" || key === "IS") {
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
    if ([ "avg", "pass", "fail", "audit", "year" ].includes(field)) {
        // value better be a valid number
        return Number.isFinite(json[key]);
    }
    if ([ "dept", "id", "instructor", "title", "uuid" ].includes(field)) {
        // value better be a valid string, e.g. look for asterisks rules and shit
        if (typeof json[key] === "string") {
            if (field === "dept" || field === "instructor" ||  field === "title") {
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
                let numcheck: number = json[key];
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
    if ([ "avg", "pass", "fail", "audit", "year" ].includes(field)) {
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
    if ([ "dept", "id", "instructor", "title", "uuid" ].includes(field)) {
        return true;
    }
    return false;
}
