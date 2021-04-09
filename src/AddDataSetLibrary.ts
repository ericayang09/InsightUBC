import {Dataset, Room, Section} from "./controller/InsightFacade";
import {InsightDataset, InsightDatasetKind, InsightError} from "./controller/IInsightFacade";
import * as JSZip from "jszip";
import * as fs from "fs";
import {validJSON} from "./dataSetHelpers";
import {
    parseForTable, parseForBuildings, findBody,
    parseForLonAndLat, roomsListHelper, parseBuildingGeoError, filterBuildings
} from "./AddRoomHelpers";

const parse5 = require("parse5");

export function addCourseDataset(
    id: string,
    content: string,
    idList: string[],
    insightDatasets: InsightDataset[],
    datasets: Dataset[],
): Promise<string[]> {
    let files: any[] = [];
    let zip = new JSZip();
    return zip.loadAsync(content, {base64: true}).then((zipFile) => {
        zipFile.folder("courses").forEach((relativePath, file) => {
            files.push(file.async("string"));
        });
        if (files.length === 0) {
            return Promise.reject(new InsightError("error: Empty Folder"));
        }
        return Promise.all(files);
    }).then((returnedFile) => { // parse file for individual sections
        let data: Section[] = [];
        for (let file of returnedFile) {
            let tempSection: Section[] = parseData(file);
            if (tempSection.length > 0 && tempSection !== undefined) {
                // add sections to list of sections: data
                tempSection.forEach((section) => {
                    data.push(section);
                });
            }
        }
        if (data.length === 0) {
            return Promise.reject(new InsightError("error: No Valid Sections"));
        } else {
            // add to memory
            let thisDataSet: Dataset = {id: id, sections: data, rooms: [], kind: InsightDatasetKind.Courses};
            const insightDataset: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: data.length};
            insightDatasets.push(insightDataset);
            datasets.push(thisDataSet);
            idList.push(id);
        }
        // save to disk; used information provided at
        // stackoverflow.com/questions/42179037/writing-json-object-to-a-json-file-with-fs-writefilesync
        try {
            fs.writeFileSync("./data/" + id, JSON.stringify(data));
        } catch (e) {
            return Promise.reject(new InsightError("error: unable to write to disk"));
        }
        return Promise.resolve(idList);
    }).catch((error: any) => {
        return Promise.reject(new InsightError("error: something went wrong while adding course dataset"));
    });
}

function parseData(file: any): Section[] {
    let returnSectionList: Section[] = [];
    let temp;
    if (!validJSON(file)) {
        return [];
    } else {
        temp = JSON.parse(file);
    }
    let tempSections = temp["result"];
    for (const section of tempSections) {
        let currentSection: Section = {
            Section: "",
            Subject: "",
            Course: "",
            Professor: "",
            Title: "",
            id: "",
            Avg: 0,
            Pass: 0,
            Fail: 0,
            Audit: 0,
            Year: 0,
        };
        currentSection.Subject = section["Subject"];
        currentSection.Course = section["Course"];
        currentSection.Professor = section["Professor"];
        currentSection.Title = section["Title"];
        currentSection.id = section["id"];
        currentSection.Avg = section["Avg"];
        currentSection.Pass = section["Pass"];
        currentSection.Fail = section["Fail"];
        currentSection.Audit = section["Audit"];
        if (section["Section"] === "overall") {
            currentSection.Year = 1900;
        } else {
            currentSection.Year = section["Year"];
        }
        returnSectionList.push(currentSection);
    }
    // used information provided at:
    // https://stackoverflow.com/questions/39308423/how-to-convert-json-object-to-an-typescript-array
    // https://www.cloudhadoop.com/2018/09/how-to-convert-array-to-json-and-json.html
    // https://stackoverflow.com/questions/59749441/parse-array-of-json-objects-to-array-of-typescript-objects
    return returnSectionList;
}

export function addRoomDataset(
    id: string,
    content: string,
    idList: string[],
    insightDatasets: InsightDataset[],
    datasets: Dataset[],
): Promise<string[]> {
    let zip = new JSZip();
    let buildings: any[] = [], table: any[] = [], roomsList: Room[] = [];
    return zip.loadAsync(content, {base64: true}).then((zipFile) => {
        let stringFile = zipFile.folder("rooms").file("index.htm").async("text");
        return Promise.resolve(stringFile);
    }).then((fileData) => {
        let htmData = parse5.parse(fileData);
        let body = findBody(htmData);
        parseForTable(body, table); // find all nodes with name "table"
        let tbody = table[0].childNodes.find((node: any) => {
            return node.nodeName === "tbody";
        });
        // Building data in form {buildingName, buildingCode, buildingAddress, href, lat, long}
        if (tbody != null) {
            buildings = parseForBuildings(tbody);
        }
        let promises = []; // parse each building in buildings for room data
        for (let build of buildings) {
            promises.push(parseForLonAndLat(build.buildingAddress).then((geoR) => {
                parseBuildingGeoError(geoR, build);
            }));
        }
        return Promise.all(promises);
    }).then(() => {
        filterBuildings(buildings); // remove/ignore all buildings without geoLocation information
        let promises: any[] = [];
        buildings.forEach((build) => promises.push(zip.file("rooms" + build.href.substr(1)).async("text")));
        return Promise.all(promises);
    }).then((roomFile) => {
        let parsedRoomFiles: any[] = [];
        roomFile.forEach((oneRoom) => parsedRoomFiles.push(parse5.parse(oneRoom)));
        roomsList = roomsListHelper(parsedRoomFiles, buildings);
        if (roomsList.length === 0) {
            return Promise.reject(new InsightError("No valid rooms found"));
        } else { // add to memory and write to disk
            addRoomsToMemory(roomsList, datasets, insightDatasets, id, idList);
            try {
                fs.writeFileSync("./data/" + id, JSON.stringify(roomsList));
            } catch (e) {
                return Promise.reject(new InsightError("unable to write room dataset to disk"));
            }
        }
        return Promise.resolve(idList);
        }).catch((error: any) => {
            return Promise.reject(new InsightError("unable to parse building files"));
        });
}

export function addRoomsToMemory(roomsList: any[],
                                 datasets: Dataset[],
                                 insightDatasets: InsightDataset[],
                                 id: string,
                                 idList: string[]) {
    let thisDataSet: Dataset = {id: id, sections: [], rooms: roomsList, kind: InsightDatasetKind.Rooms};
    let insightDataset: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms, numRows: roomsList.length};
    datasets.push(thisDataSet);
    insightDatasets.push(insightDataset);
    idList.push(id);
}
