import { expect } from "chai";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {
    InsightDataset,
    InsightDatasetKind,
    InsightError,
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import { NotFoundError } from "restify";

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
        singlecpsc210sectionandinvalidjson:
            "./test/data/singlecpsc210sectionandaninvalidjson.zip",
        manyfiletypes: "./test/data/valid_and_invalid_file_types.zip",
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

    // =================== KEVIN'S TESTS ======================

    it("Should add a valid dataset with many different file types", function () {
        const id: string = "manyfiletypes";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should reject second dataset of same id", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                futureResult = insightFacade.addDataset(
                    id,
                    datasets[id],
                    InsightDatasetKind.Courses,
                );
                return expect(futureResult).to.be.rejectedWith(InsightError);
            });
    });

    it("Add, Remove, Add same dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                const futureRemoveResult: Promise<
                    string
                > = insightFacade.removeDataset(id);
                return expect(futureRemoveResult)
                    .to.eventually.deep.equal(id)
                    .then(() => {
                        futureResult = insightFacade.addDataset(
                            id,
                            datasets[id],
                            InsightDatasetKind.Courses,
                        );
                        return expect(futureResult).to.eventually.deep.equal(
                            id,
                        );
                    });
            });
    });

    it("Add dataset with one valid json and one invalid json", function () {
        const id: string = "singlecpsc210sectionandaninvalidjson";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Add dataset with valid id with whitespace", function () {
        const id: string = "valid white space";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Add dataset with valid id with whitespaces at front and end", function () {
        const id: string = "  validwhitespace  ";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should not add whitespace id dataset", function () {
        const id: string = "    ";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["whitespaceid"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add underscore id dataset", function () {
        const id: string = "under_score";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["whitespaceid"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add null id dataset", function () {
        const id: string = null;
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["whitespaceid"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add zero sections dataset", function () {
        const id: string = "zerosections";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add dataset with no courses directory", function () {
        const id: string = "nocoursesdir";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add dataset that is not a zip", function () {
        const id: string = "rarnotzip";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    // TODO rooms bad for c1, but okay for c2 and c3
    it("Invalid dataset kind for c1", function () {
        const id: string = "courses";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should remove a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                let futureRemoveResult: Promise<
                    string
                > = insightFacade.removeDataset(id);
                return expect(futureRemoveResult).to.eventually.deep.equal(id);
            });
    });

    it("Should not remove a dataset that doesn't exist", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                let futureRemoveResult: Promise<
                    string
                > = insightFacade.removeDataset("wrongid");
                return expect(futureRemoveResult).to.be.rejectedWith(
                    NotFoundError,
                );
            });
    });

    it("Invalid id with underscore", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                let futureRemoveResult: Promise<
                    string
                > = insightFacade.removeDataset("under_score");
                return expect(futureRemoveResult).to.be.rejectedWith(
                    InsightError,
                );
            });
    });

    it("Valid id with whitespace", function () {
        const id: string = " some white space ";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then((array) => {
                const idToRemove: string = array[0];
                let futureRemoveResult: Promise<
                    string
                > = insightFacade.removeDataset(idToRemove);
                return expect(futureRemoveResult).to.eventually.deep.equal(
                    idToRemove,
                );
            });
    });

    it("Invalid id with only whitespace", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                let futureRemoveResult: Promise<
                    string
                > = insightFacade.removeDataset("   ");
                return expect(futureRemoveResult).to.be.rejectedWith(
                    InsightError,
                );
            });
    });

    it("Invalid null id", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                let futureRemoveResult: Promise<
                    string
                > = insightFacade.removeDataset(null);
                return expect(futureRemoveResult).to.be.rejectedWith(
                    InsightError,
                );
            });
    });

    // --- Tests for listDatasets ---
    it("empty list", function () {
        const futureResult: Promise<
            InsightDataset[]
        > = insightFacade.listDatasets();
        return expect(futureResult).to.eventually.deep.equal([]);
    });

    it("List with one dataset: courses", function () {
        const id: string = "courses";
        const expectedAdd: string[] = [id];
        const futureAdd: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureAdd)
            .to.eventually.deep.equal(expectedAdd)
            .then(() => {
                let expected: InsightDataset[] = [
                    {
                        id: "courses",
                        kind: InsightDatasetKind.Courses,
                        numRows: 64612,
                    },
                ];
                const futureResult: Promise<
                    InsightDataset[]
                > = insightFacade.listDatasets();
                return expect(futureResult).to.eventually.deep.equal(expected);
            });
    });

    it("List with two datasets: courses and singlecsc314section", function () {
        let futureAdd: Promise<string[]> = insightFacade.addDataset(
            "courses",
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureAdd)
            .to.eventually.deep.equal(["courses"])
            .then(() => {
                futureAdd = insightFacade.addDataset(
                    "singlecpsc314section",
                    datasets["singlecpsc314section"],
                    InsightDatasetKind.Courses,
                );
                return expect(futureAdd)
                    .to.eventually.deep.equal([
                        "courses",
                        "singlecpsc314section",
                    ])
                    .then(() => {
                        let expected: InsightDataset[] = [
                            {
                                id: "courses",
                                kind: InsightDatasetKind.Courses,
                                numRows: 64612,
                            },
                            {
                                id: "singlecpsc314section",
                                kind: InsightDatasetKind.Courses,
                                numRows: 1,
                            },
                        ];
                        const futureResult: Promise<
                            InsightDataset[]
                        > = insightFacade.listDatasets();
                        return expect(futureResult).to.eventually.deep.equal(
                            expected,
                        );
                    });
            });
    });
    // ========================================================
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
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * TODO For C1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
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
