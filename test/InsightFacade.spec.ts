import * as chai from "chai";
import {expect} from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
// import {NotFoundError} from "restify";

// This extends chai with assertions that natively support Promises
chai.use(chaiAsPromised);

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any; // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string; // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        whitespaceid: "./test/data/whitespace_id.zip",
        zerosections: "./test/data/zero_sections.zip",
        nocoursesdir: "./test/data/not_courses_dir.zip",
        rarnotzip: "./test/data/rar_not_zip.rar",
        singlecpsc314section: "./test/data/singlecpsc314section.zip",
        singlecpsc210sectionandinvalidjson: "./test/data/singlecpsc210sectionandaninvalidjson.zip",
        manyfiletypes: "./test/data/valid_and_invalid_file_types.zip",
        a: "./test/data/a.zip",
        noCourses: "./test/data/noCourses.zip",
        notCourses: "./test/data/notCourses.zip",
        noValidSection: "./test/data/noValidSection.zip",
        oneValidCourse: "./test/data/oneValidCourse.zip",
        underscore_bad: "./test/data/underscore_bad.zip",
        validWithSurprise: "./test/data/validWithSurprise.zip",
        notZip: "./test/data/courses.txt",
        withoutDir: "./test/data/withoutDir.zip",
        rooms: "./test/data/rooms.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs
                .readFileSync(datasetsToLoad[id])
                .toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // // =================== KEVIN'S TESTS ======================
    //
    // it("Should add a valid dataset with many different file types", function () {
    //     const id: string = "manyfiletypes";
    //     const expected: string[] = [id];
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.eventually.deep.equal(expected);
    // });
    //
    // it("Add dataset with one valid json and one invalid json", function () {
    //     const id: string = "singlecpsc210sectionandinvalidjson";
    //     const expected: string[] = [id];
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.eventually.deep.equal(expected);
    // });
    //
    // it("Add dataset with valid id with whitespace", function () {
    //     const id: string = "valid white space";
    //     const expected: string[] = [id];
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets["courses"],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.eventually.deep.equal(expected);
    // });
    //
    // it("Add dataset with valid id with whitespaces at front and end", function () {
    //     const id: string = "  validwhitespace  ";
    //     const expected: string[] = [id];
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets["courses"],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.eventually.deep.equal(expected);
    // });
    //
    // it("Should not add whitespace id dataset", function () {
    //     const id: string = "    ";
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets["whitespaceid"],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.be.rejectedWith(InsightError);
    // });
    //
    // it("Should not add underscore id dataset", function () {
    //     const id: string = "under_score";
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets["whitespaceid"],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.be.rejectedWith(InsightError);
    // });
    //
    // it("Should not add null id dataset", function () {
    //     const id: string = null;
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets["whitespaceid"],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.be.rejectedWith(InsightError);
    // });
    //
    // it("Should not add zero sections dataset", function () {
    //     const id: string = "zerosections";
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.be.rejectedWith(InsightError);
    // });
    //
    // it("Should not add dataset with no courses directory", function () {
    //     const id: string = "nocoursesdir";
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.be.rejectedWith(InsightError);
    // });
    //
    // it("Should not add dataset that is not a zip", function () {
    //     const id: string = "rarnotzip";
    //     const futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult).to.be.rejectedWith(InsightError);
    // });
    //
    //
    // it("Should remove a valid dataset", function () {
    //     const id: string = "courses";
    //     const expected: string[] = [id];
    //     let futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult)
    //         .to.eventually.deep.equal(expected)
    //         .then(() => {
    //             let futureRemoveResult: Promise<
    //                 string
    //             > = insightFacade.removeDataset(id);
    //             return expect(futureRemoveResult).to.eventually.deep.equal(id);
    //         });
    // });
    //
    // it("Should not remove a dataset that doesn't exist", function () {
    //     const id: string = "courses";
    //     const expected: string[] = [id];
    //     let futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult)
    //         .to.eventually.deep.equal(expected)
    //         .then(() => {
    //             let futureRemoveResult: Promise<
    //                 string
    //             > = insightFacade.removeDataset("wrongid");
    //             return expect(futureRemoveResult).to.be.rejectedWith(
    //                 NotFoundError,
    //             );
    //         });
    // });
    //
    // it("Invalid id with underscore", function () {
    //     const id: string = "courses";
    //     const expected: string[] = [id];
    //     let futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult)
    //         .to.eventually.deep.equal(expected)
    //         .then(() => {
    //             let futureRemoveResult: Promise<
    //                 string
    //             > = insightFacade.removeDataset("under_score");
    //             return expect(futureRemoveResult).to.be.rejectedWith(
    //                 InsightError,
    //             );
    //         });
    // });
    //
    // it("Valid id with whitespace", function () {
    //     const id: string = " some white space ";
    //     const expected: string[] = [id];
    //     let futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets["courses"],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult)
    //         .to.eventually.deep.equal(expected)
    //         .then((array) => {
    //             const idToRemove: string = array[0];
    //             let futureRemoveResult: Promise<
    //                 string
    //             > = insightFacade.removeDataset(idToRemove);
    //             return expect(futureRemoveResult).to.eventually.deep.equal(
    //                 idToRemove,
    //             );
    //         });
    // });
    //
    // it("Invalid id with only whitespace", function () {
    //     const id: string = "courses";
    //     const expected: string[] = [id];
    //     let futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult)
    //         .to.eventually.deep.equal(expected)
    //         .then(() => {
    //             let futureRemoveResult: Promise<
    //                 string
    //             > = insightFacade.removeDataset("   ");
    //             return expect(futureRemoveResult).to.be.rejectedWith(
    //                 InsightError,
    //             );
    //         });
    // });
    //
    // it("Invalid null id", function () {
    //     const id: string = "courses";
    //     const expected: string[] = [id];
    //     let futureResult: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureResult)
    //         .to.eventually.deep.equal(expected)
    //         .then(() => {
    //             let futureRemoveResult: Promise<
    //                 string
    //             > = insightFacade.removeDataset(null);
    //             return expect(futureRemoveResult).to.be.rejectedWith(
    //                 InsightError,
    //             );
    //         });
    // });
    //
    // // --- Tests for listDatasets ---
    // it("empty list", function () {
    //     const futureResult: Promise<
    //         InsightDataset[]
    //     > = insightFacade.listDatasets();
    //     return expect(futureResult).to.eventually.deep.equal([]);
    // });
    //
    // it("List with one dataset: courses", function () {
    //     const id: string = "courses";
    //     const expectedAdd: string[] = [id];
    //     const futureAdd: Promise<string[]> = insightFacade.addDataset(
    //         id,
    //         datasets[id],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureAdd)
    //         .to.eventually.deep.equal(expectedAdd)
    //         .then(() => {
    //             let expected: InsightDataset[] = [
    //                 {
    //                     id: "courses",
    //                     kind: InsightDatasetKind.Courses,
    //                     numRows: 64612,
    //                 },
    //             ];
    //             const futureResult: Promise<
    //                 InsightDataset[]
    //             > = insightFacade.listDatasets();
    //             return expect(futureResult).to.eventually.deep.equal(expected);
    //         });
    // });
    //
    // it("List with two datasets: courses and singlecsc314section", function () {
    //     let futureAdd: Promise<string[]> = insightFacade.addDataset(
    //         "courses",
    //         datasets["courses"],
    //         InsightDatasetKind.Courses,
    //     );
    //     return expect(futureAdd)
    //         .to.eventually.deep.equal(["courses"])
    //         .then(() => {
    //             futureAdd = insightFacade.addDataset(
    //                 "singlecpsc314section",
    //                 datasets["singlecpsc314section"],
    //                 InsightDatasetKind.Courses,
    //             );
    //             return expect(futureAdd)
    //                 .to.eventually.deep.equal([
    //                     "courses",
    //                     "singlecpsc314section",
    //                 ])
    //                 .then(() => {
    //                     let expected: InsightDataset[] = [
    //                         {
    //                             id: "courses",
    //                             kind: InsightDatasetKind.Courses,
    //                             numRows: 64612,
    //                         },
    //                         {
    //                             id: "singlecpsc314section",
    //                             kind: InsightDatasetKind.Courses,
    //                             numRows: 1,
    //                         },
    //                     ];
    //                     const futureResult: Promise<
    //                         InsightDataset[]
    //                     > = insightFacade.listDatasets();
    //                     return expect(futureResult).to.eventually.deep.equal(
    //                         expected,
    //                     );
    //                 });
    //         });
    // });
    // // ========================================================
    // ====================Erica's Tests=======================
    // one valid room dataset
    it("should add rooms dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });
    // one valid room dataset and then one valid course dataset
    it("should list after adding rooms then courses datasets", function () {
        const id: string = "rooms";
        const id2: string = "oneValidCourse";
        const insight1: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms, numRows: 364};
        const insight2: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: 17};
        const expected: InsightDataset[] = [insight1, insight2];
        const addDataSet1: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        const addDataSet2: Promise<string[]> = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        const listDataset = insightFacade.listDatasets();
        addDataSet1.then((result) => {
            expect(result).to.eventually.equal("rooms");
        }).then(() => {
            return addDataSet2;
        }).then(() => {
            return listDataset;
        }).then((result) => {
            return expect(result).to.eventually.equal(expected);
        });
    });
    // add then remove a dataset
    it("should delete after adding rooms then courses datasets", function () {
        const id: string = "rooms";
        const id2: string = "oneValidCourse";
        const insight1: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms, numRows: 364};
        const insight2: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: 17};
        const expected: InsightDataset[] = [insight1, insight2];
        const addDataSet1: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        const addDataSet2: Promise<string[]> = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        const listDataset = insightFacade.listDatasets();
        addDataSet1.then((result) => {
            //
        }).then(() => {
            return addDataSet2;
        }).then(() => {
            return listDataset;
        }).then((result) => {
            // expect(result).to.eventually.equal(expected);
        }).then(() => {
            return insightFacade.removeDataset(id);
        }).then((result) => {
            return expect(result).to.eventually.equal(id);
        });
    });
    it("Should add a valid dataset one course", function () {
        const id: string = "oneValidCourse";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });
    // ID is single character no whitespace
    it("Should add a valid dataset single char ID", function () {
        const id: string = "a";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });
    // valid with a surprise inside
    it("Should add a valid dataset with smtn not JSON", function () {
        const id: string = "validWithSurprise";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });
    // zero valid course sections
    it("Should not add dataset no valid section", function () {
        const id: string = "noValidSection";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // no course files inside root directory
    it("Should not add dataset no course files", function () {
        const id: string = "noCourses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // wrong directory name
    it("Should not add dataset wrong root directory name", function () {
        const id: string = "notCourses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // zip file without root directory inside
    it("Should not add dataset no root directory", function () {
        const id: string = "withoutDir";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // invalid ID with underscore
    it("Should not add dataset underscore in ID", function () {
        const id: string = "underscore_bad";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // not a zip file
    it("Should not add dataset not zip file", function () {
        const id: string = "notZip";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // ID is whitespace only
    it("Should not add dataset ID only whitespace", function () {
        const id: string = " ";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // shouldn't add undefined
    it("Should not add dataset ID only whitespace", function () {
        const id: string = undefined;
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // no such ID in files
    it("Should not add dataset nonexistent ID", function () {
        const id: string = "nonexistent";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // Should not add dataset twice
    it("Should not add same dataset twice", function () {
        const id: string = "oneValidCourse";
        const expected: string[] = [id];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result) => {
            expect(result).to.eventually.deep.equal(expected);
        }).then((res) => {
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        }).then((result2) => {
            return expect(result2).to.be.rejectedWith(InsightError);
        }).catch((err) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // Should add diff datasets
    it("Should add diff datasets", function () {
        const id: string = "oneValidCourse";
        const id2: string = "validWithSurprise";
        const expected: string[] = [id, id2];
        const futureResult: Promise<string[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses);
        const futureResult2: Promise<string[]> = insightFacade
            .addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        return expect(futureResult2).to.eventually.deep.equal(expected);
    });
    // should successfully remove a valid dataset
    it("Should remove a single valid Dataset", function () {
        const id: string = "oneValidCourse";
        const expectedRemove: string = id;
        const expectedAdd: string[] = [id];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((resultOfAdd) => {
                expect(resultOfAdd).to.deep.equal(expectedAdd);
                return insightFacade.removeDataset(id).then((resultOfRemove) => {
                    expect(resultOfRemove).to.deep.equal(expectedRemove);
                    return resultOfRemove;
                }).catch((err) => {
                    return err;
                });
            }).catch((err) => {
                return err;
        });
    });
    // should successfully remove a valid dataset
    it("Should add and list a valid dataset", function () {
        const id: string = "oneValidCourse";
        const expected: string = id;
        const dataset: InsightDataset = {id: "oneValidCourse", kind: InsightDatasetKind.Courses, numRows: 19};
        const expectedDatasetList: InsightDataset[] = [dataset];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((resultOfAdd) => {
                return insightFacade.listDatasets().then((resultOfList) => {
                    expect(resultOfList).to.deep.equal(expectedDatasetList);
                    return resultOfList;
            }).catch((err) => {
                return err;
            });
        }).catch((err) => {
            return err;
        });
    });
    // successfully remove valid dataset and list should be empty
    it("Should remove a valid dataset and list should be empty", function () {
        const id: string = "oneValidCourse";
        const dataset: InsightDataset = {id: "oneValidCourse", kind: InsightDatasetKind.Courses, numRows: 19};
        const expectedDatasets: InsightDataset[] = [];
        const expectedRemove: string = id;
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade.removeDataset(id);
            }).then(() => {
                return insightFacade.listDatasets();
            }).then((result) => {
                expect(result).to.deep.equal(expectedDatasets);
            }).catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });
    // shouldn't remove with whitespace
    it("Shouldn't remove a dataset that is only whitespace", function () {
        const id: string = " ";
        const expected: string = id;
        const futureResult: Promise<string> = insightFacade
            .removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // shouldn't remove with nonexistent id
    it("Should not remove nonexistent ID", function () {
        const id: string = "nonexistent";
        const expected: string = id;
        const futureResult: Promise<string> = insightFacade
            .removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(NotFoundError);
    });
    // shouldn't remove with underscore id
    it("Should not remove with ID with underscore", function () {
        const id: string = "underscore_bad";
        const expected: string = id;
        const futureResult: Promise<string> = insightFacade
            .removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // shouldn't remove with undefined
    it("Should not remove undefined id", function () {
        const id: string = undefined;
        const expected: string = id;
        const futureResult: Promise<string> = insightFacade
            .removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // datasets added shouldn't remove wrong one
    it("Should not remove wrong dataset", function () {
        const id: string = "courses";
        const id2: string = "oneValidCourse";
        const expected: string = id;
        const futureResult: Promise<string> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            }).then(() => {
                return insightFacade.removeDataset(id);
            });
        expect(futureResult).to.eventually.deep.equal(expected);
    });
    // datasets added, remove one, list should equal 1
    it("Should remove correctly list length 1", function () {
        const id: string = "courses";
        const id2: string = "oneValidCourse";
        const expected: string = id;
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result1: string[]) => {
                return insightFacade.addDataset(id2, datasets[id], InsightDatasetKind.Courses);
            }).then((result2: string[]) => {
                return insightFacade.removeDataset(id);
            }).then((result3: string) => {
                return insightFacade.listDatasets();
            }).then((datalist: InsightDataset[]) => {
                expect(datalist.length).to.equal(1);
            }).catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });
    // should not remove dataset that isn't added yet, list length should remain 1
    it("Should not remove nonexistent dataset, list length 1", function () {
        const id: string = "courses";
        const id2: string = "nonexistent";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade.removeDataset(id2);
            }).then(() => {
                return expect.fail("should not have removed");
            }).then(() => {
                return insightFacade.listDatasets();
            }).then((datalist: InsightDataset[]) => {
                expect(datalist.length).to.equal(1);
            }).catch((err: any) => {
                expect(err).to.be.instanceOf(NotFoundError);
            });
    });
    // add, remove, list all work in sequence
    it("Should work in sequence", function () {
        const id: string = "courses";
        const id2: string = "a";
        const id3: string = "nonexistent";
        const expected1: string[] = [id];
        const expected2: string[] = [id2];
        const expected3: string[] = [id3];
        return insightFacade.listDatasets()
            .then((result1: InsightDataset[]) => {
                expect(result1.length).to.equal(0);
            }).then(() => {
                return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            }).then((result2: string[]) => {
                expect(result2).to.eventually.deep.equal(expected1);
            }).then(() => {
                return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            }).then((result3: string[]) => {
                return insightFacade.listDatasets();
            }).then((result4: InsightDataset[]) => {
                expect(result4.length).to.equal(2);
            }).then(() => {
                return insightFacade.removeDataset(id);
            }).then((result5: string) => {
                expect(result5).to.eventually.deep.equal(id);
            }).then(() => {
                return insightFacade.listDatasets();
            }).then((result6: InsightDataset[]) => {
                expect(result6.length).to.equal(1);
            }).catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });
    // test another instance of InsightFacade
    it("Another instance of InsightFacade", function () {
        let insightFacade2: InsightFacade;
        insightFacade2 = new InsightFacade();
        const id: string = "courses";
        const id2: string = "oneValidCourse";
        const expected: string[] = [id];
        const expected2: string[] = [id2];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.eventually.deep.equal(expected);
            }).then(() => {
                return insightFacade2.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            }).then((result2: string[]) => {
                expect.fail(result2, expected, "should not have been added");
            }).then(() => {
                return insightFacade.listDatasets();
            }).then((result3: InsightDataset[]) => {
                expect(result3.length).to.equal(1);
            }).then(() => {
                return insightFacade2.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            }).then((result4: string[]) => {
                expect(result4).to.eventually.deep.equal(expected2);
            }).catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });
    // testing list for multiple addedDatasets
    it("test listDataset for multiple added datasets", function () {
        const id: string = "oneValidCourse";
        const id2: string = "singlecpsc314section";
        const insightDataset1: InsightDataset
            = {id: "oneValidCourse", kind: InsightDatasetKind.Courses, numRows: 19};
        const insightDataset2: InsightDataset
            = {id: "singlecpsc314section", kind: InsightDatasetKind.Courses, numRows: 1};
        const expected: InsightDataset[] = [insightDataset1, insightDataset2];
        const futureResult: Promise<InsightDataset[]>
            = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            }).then(() => {
                return insightFacade.listDatasets();
            });
        expect(futureResult).to.eventually.deep.equal(expected);
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: {
        [id: string]: { path: string; kind: InsightDatasetKind };
    } = {
        courses: {
            path: "./test/data/courses.zip",
            kind: InsightDatasetKind.Courses,
        },
        rooms: {
            path: "./test/data/rooms.zip",
            kind: InsightDatasetKind.Rooms,
        },
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${err}`,
            );
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(
                insightFacade.addDataset(id, data, ds.kind),
            );
        }
        return Promise.all(loadDatasetPromises);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<
                        any[]
                    > = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });
});
