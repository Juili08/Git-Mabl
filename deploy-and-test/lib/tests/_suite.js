"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const mablApiClient_1 = require("../mablApiClient");
describe('azure pipeline task tests', function () {
    before(function () {
    });
    after(() => {
    });
    it('builds the request correctly with all options', function (done) {
        let expected = '{"environment_id":"env","application_id":"app","plan_overrides":{"browser_types":["firefox"," chrome"," internet_explorer"],"uri":"uri"},"actions":{"rebaseline_images":true,"set_static_baseline":true}}';
        let apiClient = new mablApiClient_1.mablApiClient('test');
        let requestBody = apiClient.buildRequestBody('app', 'env', 'firefox, chrome, internet_explorer', 'uri', true, true, 'abcs', 0, {
            repositoryBranchName: 'master',
            committer: 'gcooney',
            repositoryRevisionNumber: '9317002e5458a2bf965c5f78ac19b1be4cd92b2a',
            repositoryAction: 'mabl-tests',
            repositoryUrl: 'git@github.com:mablhq/github-mabl-actions.git'
        });
        assert.equal(expected, JSON.stringify(requestBody));
        done();
    });
    it('builds the request correctly with some options', function (done) {
        let expected = '{"application_id":"app","plan_overrides":{"uri":"uri"},"actions":{}}';
        let apiClient = new mablApiClient_1.mablApiClient('test');
        let requestBody = apiClient.buildRequestBody('app', '', '', 'uri', false, false, 'abcs', 0, {
            repositoryBranchName: 'master',
            committer: 'twistedpair',
            repositoryRevisionNumber: '9317002e5458a2bf965c5f78ac19b1be4cd92b2a',
            repositoryAction: 'mabl-tests',
            repositoryUrl: 'git@github.com:mablhq/github-mabl-actions.git'
        });
        assert.equal(expected, JSON.stringify(requestBody));
        done();
    });
});
