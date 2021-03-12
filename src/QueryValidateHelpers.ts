import {validateMKeyOnly, validateMSKeyOnly} from "./QueryValidateLibrary";

let applyKeys: string[] = [];
const validApplyKeys: string[] = [ "MAX", "MIN", "AVG", "SUM", "COUNT" ];

export function validateTransformation(query: any, id: string): boolean {
    applyKeys = []; // reset
    if (query.TRANSFORMATIONS !== undefined) {
        if (query.TRANSFORMATIONS.GROUP === undefined || query.TRANSFORMATIONS.GROUP.length < 1) {
            return false;
        }
        if (query.TRANSFORMATIONS.APPLY === undefined || query.TRANSFORMATIONS.APPLY.length < 1) {
            return false;
        }
        for (let groupkey of query.TRANSFORMATIONS.GROUP) {
            if (validateMSKeyOnly(groupkey, id) === false) {
                return false;
            }
        }
        for (let rule of query.TRANSFORMATIONS.APPLY) {
            let keys: string[] = Object.keys(rule);
            if (keys.length !== 1) {
                return false;
            }
            if (keys[0].includes("_")) {
                return false;
            }
            if (applyKeys.includes(keys[0])) {
                return false;
            }
            applyKeys.push(keys[0]);
            let rulebodykeys: string[] = Object.keys(rule[keys[0]]);
            if (rulebodykeys.length !== 1) {
                return false;
            }
            if (validApplyKeys.includes(rulebodykeys[0]) === false) {
                return false;
            }
            let somekey = rule[keys[0]][rulebodykeys[0]];
            if (typeof(somekey) !== "string") {
                return false;
            }
            if (rulebodykeys[0] === "COUNT") {
                if (validateMSKeyOnly(somekey, id) === false) {
                    return false;
                }
            } else {
                if (validateMKeyOnly(somekey, id) === false) {
                    return false;
                }
            }
        }
    }
    return true;
}

export function validateStructure(query: any): boolean {
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
    if (query.OPTIONS.COLUMNS === undefined || Array.isArray(query.OPTIONS.COLUMNS) === false) {
        return false;
    }
    // Check COLUMNS isn't empty
    if (query.OPTIONS.COLUMNS !== undefined && query.OPTIONS.COLUMNS.length <= 0) {
        return false;
    }
}

export function validateColumns(query: any, id: string): boolean {
    // Check keys inside COLUMNS are valid
    for (let key of query.OPTIONS.COLUMNS) {
        if (validateMSKeyOnly(key, id) === false) {
            if (query.TRANSFORMATIONS !== undefined && query.TRANSFORMATIONS.APPLY !== undefined) {
                if (applyKeys.includes(key) === false) { // check apply key
                    return false;
                }
            } else {
                return false;
            }
        } else if (query.TRANSFORMATIONS !== undefined) {
            if (query.TRANSFORMATIONS.GROUP === undefined) {
                return false;
            }
            if (query.TRANSFORMATIONS.GROUP.includes(key) === false) {
                return false;
            }
        }
    }
}

export function validateOrder(query: any, id: string): boolean {
    // Check if OPTIONS has more than 2 keys
    if (Object.keys(query.OPTIONS).length > 2) {
        return false;
    }
    // Check if OPTIONS has 2 keys but one of them isn't ORDER
    if (Object.keys(query.OPTIONS).length === 2 && "ORDER" in query.OPTIONS === false) {
        return false;
    }
    // Check if order exists, it isn't an empty value
    if ("ORDER" in query.OPTIONS && (query.OPTIONS.ORDER === undefined || query.OPTIONS.ORDER === null)) {
        return false;
    }
    if ("ORDER" in query.OPTIONS) {
        if (typeof(query.OPTIONS.ORDER) === "string") {
            // If ORDER exists, the ORDER key must exist in COLUMNS array
            if (query.OPTIONS.COLUMNS.includes(query.OPTIONS.ORDER) === false) {
                return false;
            }
        } else {
            // c2 sort object
            if (Object.keys(query.OPTIONS.ORDER).length !== 2) {
                return false;
            }
            if (query.OPTIONS.ORDER.dir === undefined || query.OPTIONS.ORDER.keys === undefined) {
                return false;
            }
            if (query.OPTIONS.ORDER.dir !== "DOWN" && query.OPTIONS.ORDER.dir !== "UP") {
                return false;
            }
            for (let orderkey of query.OPTIONS.ORDER.keys) {
                if (query.OPTIONS.COLUMNS.includes(orderkey) === false) {
                    return false;
                }
            }
        }
    }
    return true;
}
