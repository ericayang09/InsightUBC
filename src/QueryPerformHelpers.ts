import {getDataStringKey} from "./KeyHelpers";
import {InsightDatasetKind, ResultTooLargeError} from "./controller/IInsightFacade";
import {Dataset} from "./controller/InsightFacade";
import {shouldAdd, SortRule} from "./QueryPerformLibrary";
import { Decimal } from "decimal.js";

export function getMatchingSectionsOrRoomsRaw(dataset: Dataset, query: any, ): any[] {
    let dataArrayRaw: any[] = [];
    let data: any[] = (dataset.kind === InsightDatasetKind.Courses ? dataset.sections : dataset.rooms);
    let i;
    for (i = 0; i < data.length; ++i) {
        let where: any = query.WHERE;
        let sectionOrRoom: any = data[i];
        if (shouldAdd(where, sectionOrRoom)) {
            dataArrayRaw.push(sectionOrRoom);
        }
    }
    return dataArrayRaw;
}

export function doGroupsIdontcare(groups: any[], dataArrayRaw: any[]): any {
    let retval: any = {};
    for (let data of dataArrayRaw) {
        let k: string = "";
        for (let gr of groups) {
            k += getDataStringKey(gr, data);
        }
        if (retval[k] === undefined) {
            retval[k] = [];
        }
        retval[k].push(data);
    }
    return retval;
}

let alreadySeen: any[] = []; // use for count to see if already seen
let accumulate: number = 0; // for MAX MIN SUM COUNT
let total: Decimal = new Decimal(0); // use for AVG

export function doApplyIdontcare(groupDictionary: any, apply: any[], query: any): any[] {
    let retarray: any[] = [];
    let groupskeys: any[] = Object.keys(groupDictionary);
    for (let gk of groupskeys) {
        let group: any[] = groupDictionary[gk];
        let addObj: any = fuckyou(query, group[0]);
        for (let applyRule of apply) {
            let varname = Object.keys(applyRule)[0];
            let rule: string = Object.keys(applyRule[varname])[0];
            let key: string = applyRule[varname][rule];
            // find max min sum avg count of group and push to retarray
            alreadySeen = []; // use for count to see if already seen
            accumulate = rule === "MIN" ? Number.MAX_VALUE : 0; // for MAX MIN SUM COUNT
            total = new Decimal(0); // use for AVG
            fuckignLoop(group, key, rule);
            if (rule === "SUM") {
                addObj[varname] = Number(accumulate.toFixed(2));
            } else if (rule === "AVG") {
                let avg = total.toNumber() / group.length;
                addObj[varname] = Number(avg.toFixed(2));
            } else {
                addObj[varname] = accumulate;
            }
        }
        retarray.push(addObj);
    }
    return retarray;
}

function fuckignLoop(group: any[], key: string, rule: string) {
    for (let item of group) {
        let data = getDataStringKey(key, item);
        switch (rule) {
            case "COUNT": {
                if (alreadySeen.includes(data) === false) {
                    ++accumulate;
                    alreadySeen.push(data);
                }
                break;
            }
            case "MAX": {
                if (data > accumulate) {
                    accumulate = data;
                }
                break;
            }
            case "MIN": {
                if (data < accumulate) {
                    accumulate = data;
                }
                break;
            }
            case "AVG": {
                let dec = new Decimal(data);
                total = Decimal.add(total, data);
                break;
            }
            case "SUM": {
                accumulate += data;
                break;
            }
        }
    }
}

function fuckyou(query: any, firstingroup: any): any {
    let addObj: any = {};
    for (let k of query.OPTIONS.COLUMNS) {
        let d = getDataStringKey(k, firstingroup);
        if (d !== undefined) {
            addObj[k] = d;
        }
    }
    return addObj;
}

export function sortWithSortRule(sortRule: SortRule, array: any[]): any[] {
    let retArray: any[] = [];

    for (let item of array) {
        let added: boolean = false;
        for (let i = 0; i < retArray.length; ++i) {
            let comp: any = retArray[i];
            if (compareSortRule(item, comp, sortRule)) {
                retArray.splice(i, 0, item);
                added = true;
                break;
            }
        }
        if (!added) {
            retArray.push(item);
        }
    }

    return retArray;
}

function compareSortRule(x: any, y: any, sortRule: SortRule): boolean {
    if (sortRule.keys[0] !== undefined) {
        if (x[sortRule.keys[0]] === y[sortRule.keys[0]]) {
            if (sortRule.keys[1] !== undefined) {
                if (x[sortRule.keys[1]] === y[sortRule.keys[1]]) {
                    if (sortRule.keys[2] !== undefined) {
                        if (x[sortRule.keys[2]] === y[sortRule.keys[2]]) {
                            return false;
                        } else {
                            if (sortRule.direction === "UP") {
                                return x[sortRule.keys[2]] < y[sortRule.keys[2]];
                            } else {
                                return x[sortRule.keys[2]] > y[sortRule.keys[2]];
                            }
                        }
                    } else {
                        return false;
                    }
                } else {
                    if (sortRule.direction === "UP") {
                        return x[sortRule.keys[1]] < y[sortRule.keys[1]];
                    } else {
                        return x[sortRule.keys[1]] > y[sortRule.keys[1]];
                    }
                }
            } else {
                return false;
            }
        } else {
            if (sortRule.direction === "UP") {
                return x[sortRule.keys[0]] < y[sortRule.keys[0]];
            } else {
                return x[sortRule.keys[0]] > y[sortRule.keys[0]];
            }
        }
    } else {
        return true;
    }
}
