"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const mablApiClient_1 = require("./mablApiClient");
const table_1 = require("./table");
const core = __importStar(require("@actions/core/lib/core"));
let EXECUTION_POLL_INTERVAL_MILLIS = 10000;
let EXECUTION_COMPLETED_STATUSES = [
    'succeeded',
    'failed',
    'cancelled',
    'completed',
    'terminated',
];
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            Object.keys(process.env).forEach(key => core.debug(key));
            // required input
            // const apiKey: string = core.getInput('API_KEY', {required: true});
            const applicationId = core.getInput('application-id', {
                required: false,
            });
            const environmentId = core.getInput('environment-id', {
                required: false,
            });
            const apiKey = process.env.MABL_API_KEY || '';
            if (!apiKey) {
                core.setFailed('MABL_API_KEY required');
            }
            // plan override options
            const browserTypes = core.getInput('browser-types', {
                required: false,
            });
            const uri = core.getInput('uri', { required: false });
            // deployment action options
            const rebaselineImages = parseBoolean(core.getInput('rebaseline-images', {
                required: false,
            }));
            const setStaticBaseline = parseBoolean(core.getInput('set-static-baseline', {
                required: false,
            }));
            const continueOnPlanFailure = parseBoolean(core.getInput('continue-on-failure', { required: false }));
            const eventTimeString = core.getInput('event-time', { required: false });
            const eventTime = eventTimeString ? parseInt(eventTimeString) : Date.now();
            const properties = {
                branch: process.env.GITHUB_REF,
                committer: process.env.GITHUB_ACTOR,
            };
            const baseApiUrl = process.env.APP_URL || 'https://app.mabl.com';
            // set up http client
            let apiClient = new mablApiClient_1.mablApiClient(apiKey);
            const revision = process.env.GITHUB_SHA;
            const event_time = 
            // send the deployment
            core.debug('Creating Deployment');
            let deployment = yield apiClient.postDeploymentEvent(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline, revision, eventTime, properties);
            core.setOutput('mabl-deployment-id', deployment.id);
            let outputLink = baseApiUrl;
            if (applicationId) {
                let application = yield apiClient.getApplication(applicationId);
                outputLink = `${baseApiUrl}/workspaces/${application.organization_id}/events/${deployment.id}`;
                core.debug(`Deployment triggered. View output at: ${outputLink}`);
            }
            // poll Execution result until complete
            let executionComplete = false;
            while (!executionComplete) {
                yield new Promise(resolve => setTimeout(resolve, EXECUTION_POLL_INTERVAL_MILLIS));
                let executionResult = yield apiClient.getExecutionResults(deployment.id);
                if (executionResult && executionResult.executions) {
                    let pendingExecutions = getExecutionsStillPending(executionResult);
                    if (pendingExecutions.length === 0) {
                        executionComplete = true;
                    }
                    else {
                        core.debug(`${pendingExecutions.length} mabl plan(s) are still running`);
                    }
                }
            }
            core.debug('mabl deployment runs have completed');
            let finalExecutionResult = yield apiClient.getExecutionResults(deployment.id);
            finalExecutionResult.executions.forEach((execution) => {
                table_1.prettyPrintExecution(execution);
            });
            if (finalExecutionResult.plan_execution_metrics.failed === 0) {
                core.debug('Deployment plans passed');
            }
            else if (continueOnPlanFailure) {
                core.warning(`There were ${finalExecutionResult.journey_execution_metrics.failed} journey failures but the continueOnPlanFailure flag is set so the task has been marked as passing`);
                core.setNeutral();
            }
            else {
                core.setFailed(`${finalExecutionResult.journey_execution_metrics.failed} mabl Journey(s) failed`);
            }
        }
        catch (err) {
            core.setFailed(`mabl deployment task failed for the following reason: ${err}`);
        }
    });
}
function parseBoolean(toParse) {
    if (toParse && toParse.toLowerCase() == 'true')
        return true;
    return false;
}
function getExecutionsStillPending(executionResult) {
    let pendingExecutions = executionResult.executions.filter((execution) => {
        return !(EXECUTION_COMPLETED_STATUSES.includes(execution.status) &&
            execution.stop_time);
    });
    return pendingExecutions;
}
run();
