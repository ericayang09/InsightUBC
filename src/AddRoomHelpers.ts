import {InsightDatasetKind, InsightError, } from "./controller/IInsightFacade";
import {Room} from "./controller/InsightFacade";
const http = require("http");

interface GeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}

export function parseForTable(nodes: any, dataArray: any[]) {
    if (nodes.nodeName === "table") {
        dataArray.push(nodes);
    } else if (nodes.hasOwnProperty("childNodes")) {
        nodes.childNodes.forEach((child: any) => {
            parseForTable(child, dataArray);
        });
    }
}
export function findBody(htmFile: any): any {
    let childNodes = htmFile.childNodes;
    let htmlNode = childNodes.find((node: any) => {
        return node.nodeName === "html";
    });
    let bodyNode = htmlNode.childNodes.find((node: any) => {
        return node.nodeName === "body";
    });
    return bodyNode;
}

export function parseForBuildings(node: any) {
    let buildings: any[] = [];
    if (node.nodeName === "tbody") { // childNode 'tbody' of 'table' holds all info about buildings
        let nodes: any[] = node.childNodes; // get all childNodes 'tr' from 'tbody'
        let trNodes: any[] = [];
        for (let n of nodes) {
            if (n.nodeName === "tr") {
                trNodes.push(n);
            }
        }
        for (let trNode of trNodes) {
            let trChildren: any[] = trNode.childNodes; // 'tr' childNodes incl. 'td' and '#text'
            let tdNodes: any[] = [];
            for (let child of trChildren) { // get all 'td' Nodes
                if (child.nodeName === "td") {
                    tdNodes.push(child);
                }
            }
            let thisBuilding: any
                = {buildingName: "", buildingCode: "", buildingAddress: "", href: "", lat: 0, long: 0};
            for (let tdNode of tdNodes) { // search each td Node for building properties
                let tdAttribute = tdNode.attrs[0].value;
                let tdChild = tdNode.childNodes;
                if (tdAttribute.includes("views-field-field-building-code")) {
                    if (tdChild.length === 1) {
                        thisBuilding.buildingCode = tdChild[0].value.trim();
                    }
                }
                if (tdAttribute.includes("views-field-field-building-address")) {
                    if (tdChild.length === 1) {
                        thisBuilding.buildingAddress = tdChild[0].value.trim();
                    }
                }
                if (tdAttribute.includes("views-field-title")) {
                    // tdChild will have 3 childNodes: #text, a, #text, get childNode a
                    let tdNameNode = tdChild.find((nameNode: any) => nameNode.nodeName === "a");
                    if (tdNameNode.attrs[0].name === "href") {
                        thisBuilding.buildingName = tdNameNode.childNodes[0].value.trim();
                        thisBuilding.href = tdNameNode.attrs[0].value;
                    }
                }
            }
            buildings.push(thisBuilding);
        }
    } else if (node.childNodes) { // not yet at tbody node
        for (let child of node.childNodes) { // find all child, parseForBuilding
            parseForBuildings(child);
        }
    }
    return buildings;
}

export function parseForLonAndLat(address: string): Promise<GeoResponse> {
    let geoResponse: GeoResponse = {};
    let encodedAddress = encodeURIComponent(address);
    return new Promise<any>((resolve, reject) => {
        http.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team175/" + encodedAddress,
            (result: { headers?: any; resume?: any; setEncoding?: any; on?: any; statusCode?: any; }) => {
                const {statusCode} = result;
                let returnData = "";
                let error;
                if (statusCode !== 200) { // HTTP status codes: 200 = OK
                    error = new InsightError("GeoLocation request failed; status code:" + "${statusCode}");
                }
                if (error) {
                    return reject(error.message);
                } else {
                    result.setEncoding("utf8");
                    result.on("data", (data: any) => {
                        returnData += data;
                    });
                    result.on("end", () => {
                        if (!JSON.parse(returnData).error) {
                            geoResponse.lon = JSON.parse(returnData).lon;
                            geoResponse.lat = JSON.parse(returnData).lat;
                            return resolve(geoResponse);
                        } else {
                            return reject(new InsightError("error getting lat and lon"));
                        }
                    });
                }
        });
    });
}

export function parseForRooms(room: any, building: any): Room[] {
    let roomsList: Room[] = [];
    let roomTable: any[] = [];
    let body = findBody(room);
    parseForTable(body, roomTable);
    if (roomTable.length === 0) { // if roomTable is null then there is no room info for this building, can be skipped
        return;
    }
    let tbody = roomTable[0].childNodes.find((node: any) => {
        return node.nodeName === "tbody";
    });
    let tbodyChild = tbody.childNodes;
    let trNodes: any[] = [];
    for (let child of tbodyChild) {
        if (child.nodeName === "tr") {
            trNodes.push(child);
        }
    }
    let fullName = building.buildingName;
    let shortName = building.buildingCode;
    let buildAddress = building.buildingAddress;
    for (let tr of trNodes) {
        let oneRoom: Room = {fullname: fullName, shortname: shortName, number: "", name: "", address: buildAddress,
            lat: 0, long: 0, seats: 0, type: "", furniture: "", href: ""};
        parseOneRoom(tr, oneRoom);
        oneRoom.name = shortName + "_" + oneRoom.number;
        roomsList.push(oneRoom);
    }
    return roomsList;
}

export function parseOneRoom(trNode: any, oneRoom: Room) {
    let tdNodes: any[] = [];
    for (let child of trNode.childNodes) {
        if (child.nodeName === "td") {
            tdNodes.push(child);
        }
    }
    for (let tdNode of tdNodes) {
        let tdAttribute = tdNode.attrs[0].value;
        let tdChild = tdNode.childNodes;
        if (tdAttribute.includes("views-field-field-room-number")) {
            let a = tdChild.find((node: any) => {
                return node.nodeName === "a";
            });
            let aAttribute = a.attrs[0];
            if (aAttribute.name === "href") {
                oneRoom.href = aAttribute.value;
                oneRoom.number = a.childNodes[0].value.trim();
            }
        }
        if (tdAttribute.includes("views-field-field-room-capacity")) {
            if (tdChild[0].value.trim() === "") {
                oneRoom.seats = 0;
            } else {
                oneRoom.seats = Number(tdChild[0].value);
            }
        }
        if (tdAttribute.includes("views-field-field-room-furniture")) {
            oneRoom.furniture = tdChild[0].value.trim();
        }
        if (tdAttribute.includes("views-field-field-room-type")) {
            oneRoom.type = tdChild[0].value.trim();
        }
    }
}

export function roomsListHelper(parsedRoomFiles: any[],
                                buildings: any[]): Room[] {
    let roomsList: Room[] = [];
    for (let oneBuilding of parsedRoomFiles) {
        let building = buildings[parsedRoomFiles.indexOf(oneBuilding)];
        let tempRooms = parseForRooms(oneBuilding, building);
        if (tempRooms) {
            roomsList = roomsList.concat(tempRooms);
        }
    }
    return roomsList;
}
