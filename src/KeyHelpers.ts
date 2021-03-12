// get data from object when key is string
import {retrieveIdFromKey} from "./QueryValidateLibrary";

export function getDataStringKey(key: string, obj: any): any {
    key = key.substr(key.indexOf("_") + 1, key.length); // Grabs the part after id
    let a = getDataStringKeyHelperA(key, obj);
    let b = getDataStringKeyHelperB(key, obj);
    if (a !== undefined) {
        return a;
    }
    if (b !== undefined) {
        return b;
    }
    return undefined;
}

function getDataStringKeyHelperA(key: string, obj: any): any {
    switch (key) {
        case "dept": {
            return obj.Subject;
        }
        case "id": {
            return obj.Course;
        }
        case "instructor": {
            return obj.Professor;
        }
        case "title": {
            return obj.Title;
        }
        case "uuid": {
            return obj.id;
        }
        case "avg": {
            return obj.Avg;
        }
        case "pass": {
            return obj.Pass;
        }
        case "fail": {
            return obj.Fail;
        }
        case "audit": {
            return obj.Audit;
        }
        case "year": {
            return obj.Year;
        }
    }
    return undefined;
}

function getDataStringKeyHelperB(key: string, obj: any): any {
    switch (key) {
        case "fullname": {
            return obj.fullname;
        }
        case "shortname": {
            return obj.shortname;
        }
        case "number": {
            return obj.number;
        }
        case "name": {
            return obj.name;
        }
        case "address": {
            return obj.address;
        }
        case "lat": {
            return obj.lat;
        }
        case "lon": {
            return obj.lon;
        }
        case "seats": {
            return obj.seats;
        }
        case "type": {
            return obj.type;
        }
        case "furniture": {
            return obj.furniture;
        }
        case "href": {
            return obj.href;
        }
    }
    return undefined;
}

export function getId(query: any): string {
    let randomValidKey: string = query.OPTIONS.COLUMNS[0];
    let id: string = retrieveIdFromKey(randomValidKey);
    if (id === randomValidKey) {
        if (query.TRANSFORMATIONS !== undefined && query.TRANSFORMATIONS.GROUP !== undefined) {
            randomValidKey = query.TRANSFORMATIONS.GROUP[0];
            id = retrieveIdFromKey(randomValidKey);
        }
    }
    return id;
}
